import sqlite3
import uuid
from flask import Flask, request, jsonify, g, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")

DATABASE = 'mm_motors.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        # Create Tables
        db.executescript("""
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            physical_address TEXT
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            make_model TEXT NOT NULL,
            manufacture_year INTEGER,
            license_plate TEXT,
            vin_number TEXT,
            mileage INTEGER
        );

        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            hourly_rate REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory_parts (
            id TEXT PRIMARY KEY,
            part_name TEXT NOT NULL,
            category TEXT NOT NULL,
            stock_quantity INTEGER DEFAULT 0,
            unit_price REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            vehicle_id TEXT,
            invoice_date TEXT,
            due_date TEXT,
            subtotal REAL,
            vat_amount REAL,
            grand_total REAL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
            id TEXT PRIMARY KEY,
            invoice_id TEXT,
            item_type TEXT, 
            reference_id TEXT, 
            description TEXT,
            quantity INTEGER,
            unit_price REAL,
            line_total REAL,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        );
        """)

        # Optional: Seed some initial inventory data if empty
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM inventory_parts")
        if cursor.fetchone()[0] == 0:
            seed_parts = [
                (str(uuid.uuid4()), "Engine Oil (5W-30)", "Fluids & Lubricants", 50, 150.00),
                (str(uuid.uuid4()), "Oil Filter", "Filters", 30, 85.00),
                (str(uuid.uuid4()), "Front Brake Pads", "Brakes", 20, 450.00),
                (str(uuid.uuid4()), "Spark Plugs", "Engine & Ignition", 100, 60.00),
                (str(uuid.uuid4()), "Car Battery (Standard)", "Electrical & Battery", 10, 1200.00)
            ]
            cursor.executemany("INSERT INTO inventory_parts (id, part_name, category, stock_quantity, unit_price) VALUES (?, ?, ?, ?, ?)", seed_parts)
            
            seed_services = [
                (str(uuid.uuid4()), "Hourly Labour Rate", 650.00),
                (str(uuid.uuid4()), "Minor Service", 1200.00),
                (str(uuid.uuid4()), "Major Service", 2500.00),
                (str(uuid.uuid4()), "Diagnostic Fee", 450.00)
            ]
            cursor.executemany("INSERT INTO services (id, name, hourly_rate) VALUES (?, ?, ?)", seed_services)
            db.commit()

# --- Serve HTML ---
@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

# --- API Endpoints ---
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM inventory_parts")
    parts = [dict(row) for row in cursor.fetchall()]
    return jsonify(parts)

@app.route('/api/services', methods=['GET'])
def get_services():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM services")
    services = [dict(row) for row in cursor.fetchall()]
    return jsonify(services)

@app.route('/api/invoices', methods=['GET'])
def list_invoices():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT i.*, c.full_name as customer, c.email, c.phone, c.physical_address,
               v.make_model as carName, v.manufacture_year, v.license_plate, v.vin_number, v.mileage
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN vehicles v ON i.vehicle_id = v.id
        ORDER BY i.created_at DESC
    """)
    invoices = []
    for row in cursor.fetchall():
        inv = dict(row)
        inv['amount'] = inv['grand_total']  # Map to match frontend expectations
        
        # Fetch items
        cursor.execute("SELECT * FROM invoice_items WHERE invoice_id = ?", (inv['id'],))
        items = [dict(i_row) for i_row in cursor.fetchall()]
        inv['items'] = items
        inv['description'] = items[0]['description'] if items else 'Custom Invoice'
        
        # Split make_model back if needed by frontend
        raw_car_name = str(inv.get('carName') or '')
        make_model_parts = raw_car_name.split(' ')
        inv['vehicleMake'] = make_model_parts[0] if make_model_parts else ''
        inv['vehicleModel'] = " ".join(make_model_parts[1:]) if len(make_model_parts) > 1 else ''
        
        invoices.append(inv)
        
    return jsonify(invoices)

@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    data = request.json
    db = get_db()
    cursor = db.cursor()
    
    # Generate Customer
    cust_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO customers (id, full_name, email, phone, physical_address)
        VALUES (?, ?, ?, ?, ?)
    """, (cust_id, data.get('customer'), data.get('email'), data.get('phone'), data.get('address')))

    # Generate Vehicle
    veh_id = str(uuid.uuid4())
    make_model = f"{data.get('vehicleMake', '')} {data.get('vehicleModel', '')}".strip()
    cursor.execute("""
        INSERT INTO vehicles (id, make_model, manufacture_year, license_plate, vin_number, mileage)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (veh_id, make_model, data.get('vehicleYear'), data.get('vehiclePlate'), data.get('vehicleVin'), data.get('vehicleMileage')))

    # Generate Invoice
    inv_id = data.get('id', str(uuid.uuid4()))
    try:
        subtotal = float(data.get('subtotal', 0) or 0)
        vat = float(data.get('vat', 0) or 0)
        amount = float(data.get('amount', 0) or 0)
    except ValueError:
        return jsonify({"error": "Invalid financial data"}), 400

    cursor.execute("""
        INSERT INTO invoices (id, customer_id, vehicle_id, invoice_date, due_date, subtotal, vat_amount, grand_total, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (inv_id, cust_id, veh_id, data.get('date'), data.get('dueDate'), subtotal, vat, amount, data.get('status'), data.get('notes')))

    # Generate Items
    items = data.get('items', [])
    for item in items:
        item_id = str(uuid.uuid4())
        try:
            quantity = int(item.get('quantity', 0) or 0)
            unit_price = float(item.get('unitPrice', 0) or 0)
            line_total = float(item.get('total', 0) or 0)
        except ValueError:
            quantity, unit_price, line_total = 0, 0.0, 0.0

        cursor.execute("""
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, line_total)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (item_id, inv_id, item.get('description'), quantity, unit_price, line_total))

        # Very basic inventory reduction based on exact string match (in a real system we'd use reference IDs from dropdowns)
        cursor.execute("UPDATE inventory_parts SET stock_quantity = stock_quantity - ? WHERE part_name = ? AND stock_quantity >= ?", (quantity, item.get('description'), quantity))

    db.commit()
    return jsonify({"success": True, "invoice_id": inv_id})

@app.route('/api/invoices/<invoice_id>', methods=['PATCH'])
def update_invoice_status(invoice_id):
    data = request.json
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE invoices SET status = ? WHERE id = ?", (data.get('status'), invoice_id))
    db.commit()
    return jsonify({"success": True})

@app.route('/api/invoices/<invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    db = get_db()
    cursor = db.cursor()
    # Due to ON DELETE CASCADE on invoice_items, items are automatically removed.
    # However we also need to delete the orphan vehicles & customers if desired, 
    # but for simplicity we'll just delete the invoice.
    cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    db.commit()
    return jsonify({"success": True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=8000)
