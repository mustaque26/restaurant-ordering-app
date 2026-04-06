INSERT INTO menu_items (name, description, price, category, image_url, available)
VALUES
('Chicken Biryani', 'Aromatic basmati rice with spicy chicken', 180.00, 'Biryani', 'https://images.unsplash.com/photo-1701579231348-d6d2cfd99541?auto=format&fit=crop&w=800&q=80', true),
('Paneer Tikka', 'Grilled paneer cubes with spices', 160.00, 'Starter', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80', true),
('Mutton Korma', 'Rich mutton curry with house spices', 260.00, 'Main Course', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', false),
('Veg Fried Rice', 'Wok tossed rice with vegetables', 140.00, 'Rice', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80', true);

INSERT INTO restaurant_settings (id, restaurant_name, payment_qr_image_url, contact_number)
VALUES (1, 'Franzzo', 'https://dummyimage.com/320x320/111/fff&text=Scan+QR+to+Pay', '+91-9999999999');
