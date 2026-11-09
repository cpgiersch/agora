import unittest
from copy import deepcopy
from app.product_policy import DEFAULT_BLOCKED_DOMAINS, normalize_domain, is_blocked, select_product


class ProductPolicyTests(unittest.TestCase):
    def setUp(self):
        self.blocked = list(DEFAULT_BLOCKED_DOMAINS)
        self.product = {
            "id": "product",
            "title": "Running shoe",
            "brands": [{"name": "Brand"}],
            "images": [{"url": "https://images.example.com/shoe.jpg"}],
            "offers": [{
                "domain": "retailer.example",
                "url": "https://retailer.example/shoe",
                "availability": "InStock",
                "price": {"price": 50, "currency": "USD"},
            }],
        }

    def select(self, product=None):
        return select_product(product or self.product, self.blocked, "2026-11-09T00:00:00Z")

    def test_uses_current_v1_price_and_keeps_buy_url_separate_from_image(self):
        result, reason = self.select()
        self.assertIsNone(reason)
        self.assertEqual(result["price"], 50)
        self.assertEqual(result["product_url"], "https://retailer.example/shoe")
        self.assertEqual(result["image_url"], "https://images.example.com/shoe.jpg")

    def test_explicit_stock_required(self):
        for status in [None, "", "OutOfStock", "PreOrder", "BackOrder", "LimitedAvailability", False]:
            with self.subTest(status=status):
                self.product["offers"][0]["availability"] = status
                self.assertEqual(self.select(), (None, "stock"))

    def test_unknown_stock_is_not_assumed_available(self):
        del self.product["offers"][0]["availability"]
        self.assertEqual(self.select(), (None, "stock"))

    def test_any_blocked_offer_excludes_entire_product(self):
        self.product["offers"].append({"domain": "m.temu.com", "availability": "OutOfStock"})
        self.assertEqual(self.select(), (None, "retailer"))

    def test_blocked_url_cannot_hide_behind_different_domain(self):
        self.product["offers"][0]["url"] = "https://www.shein.com/item"
        self.assertEqual(self.select(), (None, "retailer"))

    def test_domain_boundary_does_not_block_unrelated_retailer(self):
        self.assertFalse(is_blocked("notshein.com", self.blocked))
        self.assertFalse(is_blocked("shein.com.example.org", self.blocked))
        self.assertTrue(is_blocked("us.shein.com", self.blocked))

    def test_only_in_stock_offer_determines_price_and_url(self):
        out_of_stock = deepcopy(self.product["offers"][0])
        out_of_stock.update(availability="OutOfStock", url="https://retailer.example/sold-out")
        out_of_stock["price"]["price"] = 1
        self.product["offers"].insert(0, out_of_stock)
        self.assertEqual(self.select()[0]["price"], 50)

    def test_cheapest_valid_offer_is_selected(self):
        cheaper = deepcopy(self.product["offers"][0])
        cheaper.update(url="https://other.example/shoe", domain="other.example")
        cheaper["price"]["price"] = 20
        self.product["offers"].append(cheaper)
        result, _ = self.select()
        self.assertEqual(result["price"], 20)
        self.assertEqual(result["retailer_domain"], "other.example")

    def test_extra_domain_excludes_subdomains(self):
        self.blocked.append("retailer.example")
        self.product["offers"][0]["domain"] = "shop.retailer.example"
        self.assertEqual(self.select(), (None, "retailer"))

    def test_domain_normalization(self):
        self.assertEqual(normalize_domain("https://WWW.TEMU.COM/item?q=a"), "temu.com")
        for value in ["", "*.com", "localhost", "not a domain", "https://user:password@example.com"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_domain(value)


if __name__ == "__main__":
    unittest.main()
