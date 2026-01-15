"""API endpoint tests for the Jalapeno backend."""


class TestProductsAPI:
    """Tests for /api/products endpoints."""

    def test_list_products(self, client, sample_products):
        """Test GET /api/products returns products."""
        response = client.get("/api/products")
        assert response.status_code == 200

        data = response.json()
        # Verify our sample products are in the response
        product_names = [p["name"] for p in data]
        assert "Chicken Breast" in product_names
        assert "Baby Spinach" in product_names
        assert "Cheddar Cheese" in product_names

    def test_list_products_with_category_filter(self, client, sample_products):
        """Test GET /api/products with category filter."""
        response = client.get("/api/products?category=Proteins")
        assert response.status_code == 200

        data = response.json()
        # All returned products should be in Proteins category
        assert len(data) >= 1
        assert all(p["category"] == "Proteins" for p in data)

    def test_list_products_with_search(self, client, sample_products):
        """Test GET /api/products with search query."""
        response = client.get("/api/products?search=chicken")
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 1
        # Search should find products containing "chicken"
        assert any("Chicken" in p["name"] for p in data)


class TestOrdersAPI:
    """Tests for /api/orders endpoints."""

    def test_create_order(self, client, sample_products):
        """Test POST /api/orders creates an order with correct total."""
        order_data = {
            "items": [
                {"product_id": sample_products[0].id, "quantity": 2},  # Chicken @ $5.99 x 2
                {"product_id": sample_products[1].id, "quantity": 1},  # Spinach @ $3.99 x 1
            ]
        }

        response = client.post("/api/orders", json=order_data)
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "pending"
        assert len(data["items"]) == 2

        # Verify total calculation: (5.99 * 2) + (3.99 * 1) = 15.97
        expected_total = (5.99 * 2) + (3.99 * 1)
        assert abs(data["total"] - expected_total) < 0.01

    def test_list_orders(self, client, sample_products):
        """Test GET /api/orders returns created orders."""
        # Create an order first
        order_data = {
            "items": [
                {"product_id": sample_products[0].id, "quantity": 1}
            ]
        }
        client.post("/api/orders", json=order_data)

        # List orders
        response = client.get("/api/orders")
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 1


class TestCategoriesAPI:
    """Tests for /api/categories endpoint."""

    def test_list_categories(self, client, sample_products):
        """Test GET /api/categories returns categories with subcategories."""
        response = client.get("/api/categories")
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 3  # At least our 3 categories

        # Verify structure - the response uses 'name' not 'category'
        category_names = [cat["name"] for cat in data]
        assert "Proteins" in category_names
        assert "Produce" in category_names
        assert "Dairy" in category_names

        # Verify subcategories are included
        proteins = next(cat for cat in data if cat["name"] == "Proteins")
        assert "subcategories" in proteins
        assert len(proteins["subcategories"]) >= 1
