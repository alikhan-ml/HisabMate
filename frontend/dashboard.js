"use strict";

const $ = (id) => document.getElementById(id);
const API_BASE = ""; // Flask serves this dashboard and its API from the same address.

let state = { customers: [], transactions: [] };
let toastTimer;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return payload;
}

async function loadState() {
  try {
    const [customers, transactions] = await Promise.all([
      apiRequest("/api/customers"),
      apiRequest("/api/transactions")
    ]);

    state = {
      customers: customers.map(customer => ({
        ...customer,
        id: String(customer.id),
        phone: customer.phone || ""
      })),
      transactions: transactions.map(entry => ({
        ...entry,
        customerId: String(entry.customerId),
        amount: Number(entry.amount),
        type: entry.type === "udhaar" ? "credit" : entry.type
      }))
    };

    render();
  } catch (error) {
    console.error("Could not load HisabMate data:", error);
    showToast(`Could not load data: ${error.message}`);
  }
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function showDialog(id) {
  if (id === "entryDialog" && state.customers.length === 0) {
    showToast("Add a customer first.");
    return;
  }
  if (id === "entryDialog") populateCustomerSelect();
  $(id).showModal();
}

function closeDialog(id) {
  $(id).close();
}

function customerBalance(customerId) {
  return state.transactions.reduce((balance, entry) => {
    if (String(entry.customerId) !== String(customerId)) return balance;
    return balance + (entry.type === "credit" ? entry.amount : -entry.amount);
  }, 0);
}

function customerName(customerId) {
  return state.customers.find(c => String(c.id) === String(customerId))?.name || "Unknown customer";
}

function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function emptyState(title, message) {
  return `<div class="empty-state"><strong>${escapeHTML(title)}</strong>${escapeHTML(message)}</div>`;
}

function transactionRows(entries) {
  if (!entries.length) {
    return emptyState("No transactions yet", "Add a customer and record your first khata entry.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>CUSTOMER</th><th>TYPE</th><th>AMOUNT</th><th>DATE</th>
        </tr></thead>
        <tbody>
          ${entries.map(entry => {
            const isPayment = entry.type === "payment";
            const name = customerName(entry.customerId);
            return `
              <tr>
                <td>
                  <div class="person-cell">
                    <span class="avatar">${escapeHTML(name.charAt(0).toUpperCase())}</span>
                    <div class="person-name">${escapeHTML(name)}</div>
                  </div>
                </td>
                <td><span class="pill ${isPayment ? "paid" : ""}">
                  ${isPayment ? "Payment" : "Udhaar"}
                </span></td>
                <td class="${isPayment ? "amount-payment" : "amount-credit"}">
                  ${isPayment ? "−" : "+"}${money(entry.amount)}
                  ${entry.note ? `<div class="person-phone">${escapeHTML(entry.note)}</div>` : ""}
                </td>
                <td>${formatDate(entry.date)}</td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderOverview() {
  const credits = state.transactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const received = state.transactions
    .filter(t => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const pending = state.customers.reduce((sum, c) => sum + customerBalance(c.id), 0);

  $("totalUdhaar").textContent = money(credits);
  $("totalReceived").textContent = money(received);
  $("totalPending").textContent = money(pending);
  $("totalCustomers").textContent = state.customers.length;
  $("recentTransactions").innerHTML = transactionRows([...state.transactions].slice(0, 5));
}

function renderCustomers() {
  const query = $("customerSearch").value.trim().toLowerCase();
  const customers = state.customers.filter(c =>
    c.name.toLowerCase().includes(query) || (c.phone || "").toLowerCase().includes(query)
  );

  if (!customers.length) {
    $("customerList").innerHTML = emptyState(
      query ? "No matching customers" : "Your customer book is empty",
      query ? "Try another name or phone number." : "Choose “Add customer” to create your first record."
    );
    return;
  }

  $("customerList").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>CUSTOMER</th><th>OUTSTANDING BALANCE</th><th>STATUS</th><th>ACTION</th></tr></thead>
        <tbody>${customers.map(c => {
          const balance = customerBalance(c.id);
          return `<tr>
            <td>
              <div class="person-cell">
                <span class="avatar">${escapeHTML(c.name.charAt(0).toUpperCase())}</span>
                <div>
                  <div class="person-name">${escapeHTML(c.name)}</div>
                  <div class="person-phone">${escapeHTML(c.phone || "No phone added")}</div>
                </div>
              </div>
            </td>
            <td class="${balance > 0 ? "amount-credit" : "amount-payment"}">${money(balance)}</td>
            <td><span class="pill ${balance <= 0 ? "paid" : ""}">${balance > 0 ? "Pending" : balance < 0 ? "Advance" : "Settled"}</span></td>
            <td><button class="row-action" data-entry-for="${escapeHTML(c.id)}">+ Entry</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

function renderAllTransactions() {
  $("allTransactions").innerHTML = transactionRows(state.transactions);
}

function render() {
  renderOverview();
  renderCustomers();
  renderAllTransactions();
}

function populateCustomerSelect() {
  $("entryCustomer").innerHTML = state.customers.map(c =>
    `<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`
  ).join("");
}

function navigateTo(page) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.toggle("hidden", section.id !== page);
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  const titles = {
    overview: "Good day, Shopkeeper.",
    customers: "Your customer book.",
    transactions: "Every entry, in one place."
  };

  $("pageTitle").textContent = titles[page] || titles.overview;
  history.replaceState(null, "", "#" + page);
}

$("addCustomerBtn").addEventListener("click", () => showDialog("customerDialog"));
$("customersAddBtn").addEventListener("click", () => showDialog("customerDialog"));
$("addEntryBtn").addEventListener("click", () => showDialog("entryDialog"));

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => closeDialog(button.dataset.close));
});

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    navigateTo(link.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => navigateTo(button.dataset.goto));
});

$("customerSearch").addEventListener("input", renderCustomers);

$("customerList").addEventListener("click", event => {
  const button = event.target.closest("[data-entry-for]");
  if (!button) return;
  showDialog("entryDialog");
  $("entryCustomer").value = button.dataset.entryFor;
});

$("customerForm").addEventListener("submit", async event => {
  event.preventDefault();

  const name = $("customerName").value.trim();
  const phone = $("customerPhone").value.trim();
  $("customerError").textContent = "";

  if (!name) {
    $("customerError").textContent = "Please enter a customer name.";
    return;
  }

  const submitButton = $("customerForm").querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const customer = await apiRequest("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name, phone })
    });

    state.customers.unshift({
      ...customer,
      id: String(customer.id),
      phone: customer.phone || ""
    });

    $("customerForm").reset();
    closeDialog("customerDialog");
    render();
    showToast("Customer saved to MySQL successfully.");
  } catch (error) {
    $("customerError").textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

$("entryForm").addEventListener("submit", async event => {
  event.preventDefault();

  const customerId = $("entryCustomer").value;
  const type = $("entryType").value;
  const amount = Number($("entryAmount").value);
  const note = $("entryNote").value.trim();
  $("entryError").textContent = "";

  if (!state.customers.some(c => String(c.id) === String(customerId))) {
    $("entryError").textContent = "Please select a valid customer.";
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
    $("entryError").textContent = "Enter a valid amount greater than zero.";
    return;
  }

  if (type === "payment" && amount > customerBalance(customerId)) {
    $("entryError").textContent = "Payment exceeds this customer's outstanding balance.";
    return;
  }

  const submitButton = $("entryForm").querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const entry = await apiRequest("/api/transactions", {
      method: "POST",
      body: JSON.stringify({ customerId, type, amount, note })
    });

    state.transactions.unshift({
      ...entry,
      customerId: String(entry.customerId),
      amount: Number(entry.amount),
      type: entry.type === "udhaar" ? "credit" : entry.type
    });

    $("entryForm").reset();
    closeDialog("entryDialog");
    render();
    showToast(type === "credit" ? "Udhaar saved to MySQL." : "Payment saved to MySQL.");
  } catch (error) {
    $("entryError").textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

const initialPage = location.hash.slice(1);
navigateTo(["overview", "customers", "transactions"].includes(initialPage)
  ? initialPage
  : "overview");

loadState();
