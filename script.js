const STORAGE = {
  accounts: "northbank_accounts_v1",
  transactions: "northbank_transactions_v1",
  session: "northbank_demo_session"
};

let accounts = readStorage(STORAGE.accounts, []);
let transactions = readStorage(STORAGE.transactions, []);
let currentAction = "create";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORAGE.accounts, JSON.stringify(accounts));
  localStorage.setItem(STORAGE.transactions, JSON.stringify(transactions));
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR"
  }).format(amount);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function findAccount(id) {
  return accounts.find(account => account.id === id);
}

function generateAccountNumber() {
  let number;
  do {
    number = "NB" + Math.floor(1000000000 + Math.random() * 9000000000);
  } while (accounts.some(account => account.number === number));
  return number;
}

function addTransaction(type, account, amount, description) {
  transactions.unshift({
    id: crypto.randomUUID(),
    type,
    accountNumber: account.number,
    description,
    amount,
    date: new Date().toLocaleString("en-IN")
  });
}

/* Demo-only sign-in and sign-up using browser localStorage.
   Do not use this client-side authentication for real banking. */
const USERS_STORAGE = "northbank_demo_users_v1";

function getUsers() {
  return readStorage(USERS_STORAGE, []);
}

function showLoginForm() {
  document.getElementById("signup-form").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
  document.getElementById("login-error").textContent = "";
}

function showSignupForm() {
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("signup-form").classList.remove("hidden");
  document.getElementById("signup-error").textContent = "";
}

document.getElementById("show-signup").addEventListener("click", showSignupForm);
document.getElementById("show-login").addEventListener("click", showLoginForm);

function showApplication() {
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  renderAll();
}

document.getElementById("signup-form").addEventListener("submit", event => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const confirm = String(form.get("confirm") || "");
  const error = document.getElementById("signup-error");
  error.textContent = "";

  if (!name || !email || username.length < 4 || password.length < 6) {
    error.textContent = "Please complete all fields. Username needs 4 characters and password needs 6.";
    return;
  }
  if (password !== confirm) {
    error.textContent = "Passwords do not match.";
    return;
  }

  const users = getUsers();
  const exists = users.some(user =>
    user.username.toLowerCase() === username.toLowerCase() || user.email === email
  );

  if (username.toLowerCase() === "admin" || exists) {
    error.textContent = "That username or email is already registered.";
    return;
  }

  users.push({ name, email, username, password });
  localStorage.setItem(USERS_STORAGE, JSON.stringify(users));

  event.currentTarget.reset();
  showLoginForm();
  document.getElementById("username").value = username;
  document.getElementById("login-error").textContent = "Registration successful. Please sign in.";
});

document.getElementById("login-form").addEventListener("submit", event => {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("login-error");

  const isAdmin = username === "admin" && password === "admin123";
  const registeredUser = getUsers().find(user =>
    user.username.toLowerCase() === username.toLowerCase() && user.password === password
  );

  if (isAdmin || registeredUser) {
    sessionStorage.setItem(STORAGE.session, "yes");
    error.textContent = "";
    showApplication();
  } else {
    error.textContent = "Incorrect username or password. Please sign up if you are new.";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem(STORAGE.session);
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("login-form").reset();
  showLoginForm();
});

if (sessionStorage.getItem(STORAGE.session) === "yes") {
  showApplication();
}

/* Render dashboard and all data views. */
function renderAll() {
  document.getElementById("total-accounts").textContent = accounts.length;
  document.getElementById("total-balance").textContent =
    formatMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  document.getElementById("total-transactions").textContent = transactions.length;

  renderAccounts();
  renderHolders();
  renderTransactions();
  renderRecentTransactions();
}

function renderAccounts() {
  const table = document.getElementById("accounts-table");

  if (!accounts.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty">No accounts yet. Create your first account.</td></tr>';
    return;
  }

  table.innerHTML = accounts.map(account => `
    <tr>
      <td><b>${escapeHTML(account.name)}</b></td>
      <td>${escapeHTML(account.number)}</td>
      <td>${escapeHTML(account.type)}</td>
      <td><b>${formatMoney(account.balance)}</b></td>
      <td><span class="status">Active</span></td>
    </tr>
  `).join("");
}

function renderHolders() {
  const search = (document.getElementById("holder-search").value || "").toLowerCase();
  const filtered = accounts.filter(account =>
    [account.name, account.number, account.email, account.phone]
      .join(" ").toLowerCase().includes(search)
  );

  const container = document.getElementById("holder-cards");
  container.innerHTML = filtered.length ? filtered.map(account => `
    <article class="holder-card">
      <h3>${escapeHTML(account.name)}</h3>
      <p>Account: ${escapeHTML(account.number)}</p>
      <p>${escapeHTML(account.email)}</p>
      <p>${escapeHTML(account.phone)}</p>
      <p>${escapeHTML(account.type)} · ${formatMoney(account.balance)}</p>
      <button type="button" data-holder-id="${account.id}">View full details</button>
    </article>
  `).join("") : '<div class="panel empty">No account holders found.</div>';
}

document.getElementById("holder-cards").addEventListener("click", event => {
  const button = event.target.closest("[data-holder-id]");
  if (!button) return;

  const account = findAccount(button.dataset.holderId);
  if (!account) return;

  const detail = document.getElementById("holder-detail");
  detail.classList.remove("hidden");
  detail.innerHTML = `
    <h3>Account Holder Profile</h3>
    <div class="detail-grid">
      <div class="detail-item"><small>Full name</small><strong>${escapeHTML(account.name)}</strong></div>
      <div class="detail-item"><small>Account number</small><strong>${escapeHTML(account.number)}</strong></div>
      <div class="detail-item"><small>Email address</small><strong>${escapeHTML(account.email)}</strong></div>
      <div class="detail-item"><small>Phone number</small><strong>${escapeHTML(account.phone)}</strong></div>
      <div class="detail-item"><small>Account type</small><strong>${escapeHTML(account.type)}</strong></div>
      <div class="detail-item"><small>Available balance</small><strong>${formatMoney(account.balance)}</strong></div>
    </div>
  `;
  detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function renderTransactions() {
  const query = (document.getElementById("transaction-search").value || "").toLowerCase();
  const filtered = transactions.filter(transaction =>
    [transaction.type, transaction.accountNumber, transaction.description]
      .join(" ").toLowerCase().includes(query)
  );

  const table = document.getElementById("transactions-table");
  table.innerHTML = filtered.length ? filtered.map(transaction => {
    const incoming = ["Deposit", "Transfer In"].includes(transaction.type);
    return `
      <tr>
        <td>${escapeHTML(transaction.type)}</td>
        <td>${escapeHTML(transaction.accountNumber)}</td>
        <td>${escapeHTML(transaction.description)}</td>
        <td>${escapeHTML(transaction.date)}</td>
        <td class="${incoming ? "positive" : "negative"}">
          <b>${incoming ? "+" : "−"}${formatMoney(transaction.amount)}</b>
        </td>
      </tr>
    `;
  }).join("") : '<tr><td colspan="5" class="empty">No transactions found.</td></tr>';
}

function renderRecentTransactions() {
  const container = document.getElementById("recent-list");
  container.innerHTML = transactions.length ? transactions.slice(0, 5).map(transaction => {
    const incoming = ["Deposit", "Transfer In"].includes(transaction.type);
    return `
      <div class="transaction-item">
        <div class="transaction-info">
          <strong>${escapeHTML(transaction.description)}</strong>
          <small>${escapeHTML(transaction.accountNumber)} · ${escapeHTML(transaction.date)}</small>
        </div>
        <b class="amount ${incoming ? "positive" : "negative"}">
          ${incoming ? "+" : "−"}${formatMoney(transaction.amount)}
        </b>
      </div>
    `;
  }).join("") : '<p class="empty">No transactions yet.</p>';
}

/* Modal forms for account creation and money operations. */
function inputField(label, name, type = "text", placeholder = "") {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}"
        ${type === "number" ? 'min="0.01" step="0.01"' : ""} required>
    </div>
  `;
}

function accountSelect(name, label) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" required>
        <option value="">Select account</option>
        ${accounts.map(account => `
          <option value="${account.id}">${escapeHTML(account.name)} — ${escapeHTML(account.number)}</option>
        `).join("")}
      </select>
    </div>
  `;
}

const modalBackdrop = document.getElementById("modal-backdrop");

function openModal(action) {
  currentAction = action;
  document.getElementById("form-error").textContent = "";

  const titles = {
    create: "Create New Account",
    deposit: "Deposit Money",
    withdraw: "Withdraw Money",
    transfer: "Transfer Money"
  };

  document.getElementById("modal-title").textContent = titles[action];
  document.getElementById("submit-form").textContent = action === "create" ? "Create Account" : titles[action];

  const fields = document.getElementById("form-fields");

  if (action === "create") {
    fields.innerHTML =
      inputField("Customer full name", "name", "text", "Enter full name") +
      inputField("Email address", "email", "email", "name@example.com") +
      inputField("Phone number", "phone", "tel", "Enter phone number") +
      `<div class="field"><label for="type">Account type</label>
        <select id="type" name="type" required>
          <option value="Savings">Savings Account</option>
          <option value="Current">Current Account</option>
        </select></div>` +
      inputField("Opening balance (₹)", "balance", "number", "Enter amount");
  } else if (action === "transfer") {
    fields.innerHTML =
      accountSelect("from", "From account") +
      accountSelect("to", "To account") +
      inputField("Transfer amount (₹)", "amount", "number", "Enter amount");
  } else {
    fields.innerHTML =
      accountSelect("accountId", "Select account") +
      inputField("Amount (₹)", "amount", "number", "Enter amount");
  }

  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  document.getElementById("bank-form").reset();
  document.getElementById("form-error").textContent = "";
}

document.getElementById("bank-form").addEventListener("submit", event => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.currentTarget));
  const error = document.getElementById("form-error");
  error.textContent = "";

  if (currentAction === "create") {
    const balance = Number(data.balance);

    if (!data.name.trim() || !data.phone.trim() ||
        !Number.isFinite(balance) || balance < 0) {
      error.textContent = "Enter valid customer details and a non-negative opening balance.";
      return;
    }

    const account = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      type: data.type,
      number: generateAccountNumber(),
      balance
    };

    accounts.push(account);
    if (balance > 0) addTransaction("Deposit", account, balance, "Opening balance");

  } else if (currentAction === "transfer") {
    const from = findAccount(data.from);
    const to = findAccount(data.to);
    const amount = Number(data.amount);

    if (!from || !to || from.id === to.id) {
      error.textContent = "Choose two different accounts.";
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      error.textContent = "Enter an amount greater than zero.";
      return;
    }
    if (from.balance < amount) {
      error.textContent = "Insufficient balance in the source account.";
      return;
    }

    from.balance -= amount;
    to.balance += amount;
    addTransaction("Transfer Out", from, amount, "Transfer to " + to.name);
    addTransaction("Transfer In", to, amount, "Transfer from " + from.name);

  } else {
    const account = findAccount(data.accountId);
    const amount = Number(data.amount);

    if (!account || !Number.isFinite(amount) || amount <= 0) {
      error.textContent = "Select an account and enter a valid amount.";
      return;
    }
    if (currentAction === "withdraw" && account.balance < amount) {
      error.textContent = "Insufficient balance.";
      return;
    }

    if (currentAction === "deposit") {
      account.balance += amount;
      addTransaction("Deposit", account, amount, "Cash deposit");
    } else {
      account.balance -= amount;
      addTransaction("Withdrawal", account, amount, "Cash withdrawal");
    }
  }

  saveData();
  renderAll();
  closeModal();
  showToast("Operation completed successfully.");
});

/* Buttons, search and navigation. */
document.getElementById("open-create").addEventListener("click", () => openModal("create"));
document.getElementById("accounts-create").addEventListener("click", () => openModal("create"));

document.getElementById("quick-deposit").addEventListener("click", () =>
  accounts.length ? openModal("deposit") : showToast("Create an account first.")
);
document.getElementById("quick-withdraw").addEventListener("click", () =>
  accounts.length ? openModal("withdraw") : showToast("Create an account first.")
);
document.getElementById("quick-transfer").addEventListener("click", () =>
  accounts.length > 1 ? openModal("transfer") : showToast("You need at least two accounts.")
);

document.getElementById("close-modal").addEventListener("click", closeModal);
document.getElementById("cancel-modal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", event => {
  if (event.target === modalBackdrop) closeModal();
});

document.getElementById("holder-search").addEventListener("input", renderHolders);
document.getElementById("transaction-search").addEventListener("input", renderTransactions);

function showView(view) {
  document.querySelectorAll(".view").forEach(section => section.classList.add("hidden"));
  document.getElementById(view + "-view").classList.remove("hidden");

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = { holders: "Account Holders", about: "About Bank" };
  document.getElementById("page-title").textContent =
    titles[view] || view.charAt(0).toUpperCase() + view.slice(1);

  if (view === "holders") {
    document.getElementById("holder-detail").classList.add("hidden");
    renderHolders();
  }
}

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.go));
});
