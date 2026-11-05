
# HisabMate

**A Smart Digital Khata Management System for Small Shopkeepers.**

HisabMate is a web-based application that helps small shopkeepers manage customer accounts, track udhaar (credit), record payments, and calculate outstanding balances digitally.

## Features

- **Customer Management:** Add and manage customer profiles and contact details.
- **Udhaar Tracking:** Record credit transactions for each customer.
- **Payment Recording:** Record payments received from customers.
- **Automatic Balance Calculation:** Calculate pending balances automatically.
- **Transaction History:** View recorded udhaar and payment entries.
- **Database Storage:** Store customer and transaction data in MySQL.
- **Data Persistence:** Customer and transaction records remain available after refreshing the dashboard.

## Design Choices

- **Playfair Display** for warm, classic display headings.
- **DM Sans** for readable body text, navigation and buttons.
- Warm paper `#f7f1e7`, sage `#dce5d0`, and forest green `#213f2c`.
- Responsive dashboard interface with a clean, classic aesthetic.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| Database | MySQL |
| Database Connector | MySQL Connector Python |
| Environment Configuration | Python Dotenv |

## Project Structure

```text
HisabMate/
│
├── app.py
├── README.md
├── .gitignore
│
├── assets/
│
└── frontend/
    ├── index.html
    ├── dashboard.html
    ├── dashboard.css
    ├── dashboard.js
    ├── script.js
    └── style.css
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd HisabMate
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install flask mysql-connector-python python-dotenv
```

### 4. Configure MySQL

Create the database:

```sql
CREATE DATABASE hisabmate;
```

Create a local `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=hisabmate
```

Create the required `customers` and `transactions` tables before starting the application.

**Note:** Never upload your `.env` file or database passwords to GitHub.

### 5. Start the application

```bash
python app.py
```

### 6. Open the dashboard

Visit:

```text
http://127.0.0.1:5000/dashboard
```

## Project Status

**Core MVP implemented and tested locally.**

Customer creation, MySQL storage, udhaar recording, payment recording, automatic pending balance calculation, and data persistence have been tested.

Further enhancements such as customer ledger views, authentication, and deployment can be added in future versions.

## Developer

**Ali Khan**

BCA – Artificial Intelligence and Data Science
