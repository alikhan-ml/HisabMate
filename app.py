from decimal import Decimal, InvalidOperation
from pathlib import Path

import mysql.connector
from mysql.connector import Error
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)

# Replace this placeholder with your NEW MySQL password locally.
# Do not share this file while it contains your database credentials.
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "ali0106f",
    "database": "hisabmate",
}

# app.py is in C:\\code warehouse; the site files are in
# C:\\code warehouse\\HisabMate\\frontend.
PROJECT_DIR = Path(__file__).resolve().parent / "HisabMate"
FRONTEND_DIR = PROJECT_DIR / "frontend"
ASSETS_DIR = PROJECT_DIR / "assets"


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


def json_error(message, status_code=400):
    return jsonify({"error": message}), status_code


def serialize_customer(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "phone": row["phone"] or "",
        "address": row.get("address") or "",
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
    }


def serialize_transaction(row):
    # The dashboard uses "credit" for Udhaar; MySQL stores it as "udhaar".
    return {
        "id": row["id"],
        "customerId": str(row["customer_id"]),
        "type": "credit" if row["type"] == "udhaar" else "payment",
        "amount": float(row["amount"]),
        "note": row["note"] or "",
        "date": row["created_at"].isoformat() if row.get("created_at") else None,
    }


@app.get("/")
def home():
    if (FRONTEND_DIR / "index.html").is_file():
        return send_from_directory(str(FRONTEND_DIR), "index.html")
    if (FRONTEND_DIR / "dashboard.html").is_file():
        return send_from_directory(str(FRONTEND_DIR), "dashboard.html")
    return json_error(f"Frontend folder was not found: {FRONTEND_DIR}", 404)


@app.get("/dashboard")
@app.get("/dashboard.html")
def dashboard():
    if not (FRONTEND_DIR / "dashboard.html").is_file():
        return json_error(f"dashboard.html was not found in: {FRONTEND_DIR}", 404)
    return send_from_directory(str(FRONTEND_DIR), "dashboard.html")


@app.get("/index.html")
def index_page():
    if (FRONTEND_DIR / "index.html").is_file():
        return send_from_directory(str(FRONTEND_DIR), "index.html")
    return dashboard()


# Dashboard files are inside HisabMate/frontend.
@app.get("/dashboard.css")
def dashboard_css():
    return send_from_directory(str(FRONTEND_DIR), "dashboard.css")


@app.get("/dashboard.js")
def dashboard_js():
    return send_from_directory(str(FRONTEND_DIR), "dashboard.js")


# Landing-page CSS/JS are in HisabMate/, outside the frontend subfolder.
@app.get("/style.css")
def landing_css():
    return send_from_directory(str(PROJECT_DIR), "style.css")


@app.get("/script.js")
def landing_js():
    return send_from_directory(str(PROJECT_DIR), "script.js")


@app.get("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(str(ASSETS_DIR), filename)


@app.get("/health")
def health():
    return jsonify({"status": "healthy"})


@app.get("/api/test")
def test_api():
    return jsonify({
        "message": "Frontend can connect to HisabMate API!",
        "connected": True,
    })


@app.get("/api/db-test")
def db_test():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        return jsonify({
            "connected": True,
            "database": "hisabmate",
            "tables": tables,
        })
    except Error:
        app.logger.exception("Database connection failed")
        return json_error("Database connection failed. Check DB_CONFIG and the Flask terminal.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@app.get("/api/customers")
def get_customers():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, name, phone, address, created_at "
            "FROM customers ORDER BY id DESC"
        )
        return jsonify([serialize_customer(row) for row in cursor.fetchall()])
    except Error:
        app.logger.exception("Could not load customers")
        return json_error("Could not load customers from the database.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@app.post("/api/customers")
def create_customer():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip() or None

    if not name:
        return json_error("Customer name is required.")
    if len(name) > 100:
        return json_error("Customer name must be 100 characters or fewer.")
    if phone and len(phone) > 15:
        return json_error("Phone number must be 15 characters or fewer.")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO customers (name, phone) VALUES (%s, %s)",
            (name, phone),
        )
        connection.commit()
        new_id = cursor.lastrowid
        return jsonify({
            "id": new_id,
            "name": name,
            "phone": phone or "",
            "address": "",
        }), 201
    except Error:
        if connection is not None:
            connection.rollback()
        app.logger.exception("Could not create customer")
        return json_error("Could not save customer to the database.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@app.get("/api/transactions")
def get_transactions():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, customer_id, type, amount, note, created_at "
            "FROM transactions ORDER BY created_at DESC, id DESC"
        )
        return jsonify([serialize_transaction(row) for row in cursor.fetchall()])
    except Error:
        app.logger.exception("Could not load transactions")
        return json_error("Could not load transactions from the database.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@app.post("/api/transactions")
def create_transaction():
    data = request.get_json(silent=True) or {}

    try:
        customer_id = int(data.get("customerId"))
    except (TypeError, ValueError):
        return json_error("Please select a valid customer.")

    dashboard_type = str(data.get("type", "")).strip().lower()
    if dashboard_type not in ("credit", "payment"):
        return json_error("Transaction type must be credit or payment.")

    try:
        amount = Decimal(str(data.get("amount", "")))
    except (InvalidOperation, TypeError, ValueError):
        return json_error("Enter a valid transaction amount.")

    if not amount.is_finite() or amount <= 0 or amount > Decimal("99999999.99"):
        return json_error("Amount must be greater than zero and no more than 99,999,999.99.")

    amount = amount.quantize(Decimal("0.01"))
    note = str(data.get("note", "")).strip() or None
    if note and len(note) > 255:
        return json_error("Note must be 255 characters or fewer.")

    db_type = "udhaar" if dashboard_type == "credit" else "payment"
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT id FROM customers WHERE id = %s", (customer_id,))
        if cursor.fetchone() is None:
            return json_error("Selected customer does not exist.")

        if db_type == "payment":
            cursor.execute(
                "SELECT COALESCE(SUM(CASE WHEN type = 'udhaar' THEN amount "
                "ELSE -amount END), 0) AS balance "
                "FROM transactions WHERE customer_id = %s",
                (customer_id,),
            )
            balance = Decimal(str(cursor.fetchone()["balance"]))
            if amount > balance:
                return json_error("Payment exceeds this customer's outstanding balance.")

        cursor.execute(
            "INSERT INTO transactions (customer_id, type, amount, note) "
            "VALUES (%s, %s, %s, %s)",
            (customer_id, db_type, amount, note),
        )
        new_id = cursor.lastrowid
        connection.commit()

        cursor.execute(
            "SELECT id, customer_id, type, amount, note, created_at "
            "FROM transactions WHERE id = %s",
            (new_id,),
        )
        row = cursor.fetchone()
        return jsonify(serialize_transaction(row)), 201
    except Error:
        if connection is not None:
            connection.rollback()
        app.logger.exception("Could not create transaction")
        return json_error("Could not save transaction to the database.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    # Run from the project root: C:\\code warehouse
    app.run(host="127.0.0.1", port=5000, debug=False)
