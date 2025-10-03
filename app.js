const MONTH_LABELS = ["Jaanuar", "Veebruar", "Märts", "Aprill", "Mai", "Juuni", "Juuli", "August", "September", "Oktoober", "November", "Detsember"];
const formatter = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });

export function formatEUR(value) {
  return formatter.format(Number(value || 0));
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const focusTrapState = new WeakMap();

export function trapFocus(dialog) {
  const focusables = getFocusable(dialog);
  const previouslyFocused = document.activeElement;

  function onKeydown(event) {
    if (event.key !== "Tab" || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  dialog.addEventListener("keydown", onKeydown);
  focusTrapState.set(dialog, { onKeydown, previouslyFocused });
  requestAnimationFrame(() => {
    (focusables[0] || dialog).focus();
  });
}

export function releaseFocus(dialog) {
  const state = focusTrapState.get(dialog);
  if (!state) return;
  dialog.removeEventListener("keydown", state.onKeydown);
  if (state.previouslyFocused instanceof HTMLElement) {
    state.previouslyFocused.focus();
  }
  focusTrapState.delete(dialog);
}

function getFocusable(node) {
  return Array.from(
    node.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("inert"));
}

const monthDisplay = document.getElementById("current-month");
const monthButtons = document.querySelectorAll("[data-month]");
const summaryCards = document.querySelectorAll("[data-summary-value]");
const categoryAmounts = document.querySelectorAll("[data-progress-value]");
const tableBody = document.getElementById("transaction-rows");
const totalOutput = document.getElementById("transaction-total");
const filterInput = document.getElementById("transaction-filter");
const addExpenseTrigger = document.getElementById("open-add-expense");
const addExpenseDialog = document.getElementById("add-expense-dialog");
const addExpenseForm = addExpenseDialog?.querySelector("form");
const expenseAmount = document.getElementById("expense-amount");
const expenseError = document.getElementById("expense-amount-error");
const transactionDialog = document.getElementById("transaction-dialog");
const transactionDialogBody = document.getElementById("transaction-dialog-body");
const liveRegion = document.getElementById("live-region");
const tableScroll = document.querySelector(".table-scroll");
const overflowAddButtons = document.querySelectorAll("[data-overflow-add]");

const transactions = Array.from(tableBody?.rows || []).map(rowToTransaction);
let activeMonth = new Date();
let filterTerm = "";
let frame = null;

hydrateUI();

function hydrateUI() {
  if (addExpenseDialog?.open) {
    addExpenseDialog.close();
  }
  enhanceMonthPicker();
  enhanceSummaries();
  enhanceCategories();
  enhanceTable();
  setupDialog(addExpenseDialog);
  setupDialog(transactionDialog);
  queueIdle(setupFiltering);
  if (addExpenseForm) {
    addExpenseForm.addEventListener("submit", handleExpenseSubmit);
  }
  if (addExpenseTrigger && addExpenseDialog) {
    addExpenseTrigger.addEventListener("click", () => openDialog(addExpenseDialog, addExpenseTrigger));
  }
  overflowAddButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openDialog(addExpenseDialog, addExpenseTrigger || button);
      const details = button.closest("details");
      if (details) {
        details.open = false;
      }
    });
  });
  if (expenseAmount) {
    expenseAmount.addEventListener("blur", () => formatExpenseInput());
    expenseAmount.addEventListener("input", () => clearError());
  }
  renderTransactions();
  updateMonthLabel();
}

function enhanceMonthPicker() {
  monthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.month === "next" ? 1 : -1;
      activeMonth.setMonth(activeMonth.getMonth() + direction);
      updateMonthLabel();
      announce(`Kuu muudetud: ${monthDisplay.textContent}`);
    });
  });
}

function enhanceSummaries() {
  summaryCards.forEach((node) => {
    const container = node.closest("[data-amount]");
    const amount = Number(container?.dataset.amount || 0);
    node.textContent = formatEUR(amount);
  });
}

function enhanceCategories() {
  categoryAmounts.forEach((node) => {
    const item = node.closest(".category-item");
    const progress = Number(item?.dataset.progress || 0);
    const amount = Number(node.dataset.amount || 0);
    node.textContent = formatEUR(amount);
    const fill = item?.querySelector(".category-bar__fill");
    requestAnimationFrame(() => {
      if (fill) fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    });
  });
}

function enhanceTable() {
  if (!tableBody) return;
  tableBody.addEventListener("click", onTransactionActivate);
  tableBody.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onTransactionActivate(event);
    }
  });
  Array.from(tableBody.rows).forEach((row) => {
    row.tabIndex = 0;
    const amountCell = row.querySelector("[data-amount]");
    if (amountCell) {
      const value = Number(amountCell.dataset.amount || amountCell.textContent);
      amountCell.textContent = formatEUR(value);
    }
  });
  if (tableScroll) {
    tableScroll.addEventListener("scroll", () => scheduleShadowUpdate(), { passive: true });
    window.addEventListener("resize", () => scheduleShadowUpdate());
    scheduleShadowUpdate();
  }
}

function setupFiltering() {
  if (!filterInput) return;
  const debounced = debounce((value) => {
    filterTerm = value.toLowerCase();
    renderTransactions();
  }, 180);
  filterInput.addEventListener("input", (event) => {
    debounced(event.target.value);
  });
}

function handleExpenseSubmit(event) {
  const submitter = event.submitter;
  if (!submitter || submitter.value === "cancel") return;
  event.preventDefault();
  const data = new FormData(addExpenseForm);
  const amount = parseNumber(data.get("amount"));
  if (!amount) {
    setError("Sisesta summa.");
    expenseAmount?.focus();
    return;
  }
  clearError();
  const entry = {
    id: crypto.randomUUID?.() || String(Date.now()),
    date: data.get("date") || formatISODate(new Date()),
    category: data.get("category") || "Muu",
    note: (data.get("note") || "").toString(),
    amount,
  };
  transactions.push(entry);
  appendTransactionRow(entry);
  renderTransactions();
  addExpenseDialog?.close();
  announce("Kulu lisatud.");
  addExpenseForm.reset();
}

function appendTransactionRow(entry) {
  if (!tableBody) return;
  const row = document.createElement("tr");
  row.dataset.id = entry.id;
  row.innerHTML = `
    <td data-label="Kuupäev">${formatDisplayDate(entry.date)}</td>
    <td data-label="Kategooria">${entry.category}</td>
    <td data-label="Märkus" class="col-notes">${entry.note || "—"}</td>
    <td data-label="Summa" class="numeric" data-amount="${entry.amount}">${formatEUR(entry.amount)}</td>
  `;
  row.tabIndex = 0;
  tableBody.append(row);
}

function renderTransactions() {
  if (!tableBody) return;
  const rows = Array.from(tableBody.rows);
  rows.forEach((row) => {
    const transaction = rowToTransaction(row);
    const matchesFilter = filterTerm
      ? `${transaction.category} ${transaction.note}`.toLowerCase().includes(filterTerm)
      : true;
    row.hidden = !matchesFilter;
    const amountCell = row.querySelector("[data-amount]");
    if (amountCell) {
      const value = Number(amountCell.dataset.amount || 0);
      amountCell.textContent = formatEUR(value);
    }
  });
  const total = rows
    .filter((row) => !row.hidden)
    .reduce((sum, row) => {
      const amountCell = row.querySelector("[data-amount]");
      return sum + Number(amountCell?.dataset.amount || 0);
    }, 0);
  if (totalOutput) {
    totalOutput.textContent = `Saldo: ${formatEUR(total)}`;
  }
}

function onTransactionActivate(event) {
  const row = event.target.closest("tr");
  if (!row || !transactionDialog) return;
  const transaction = rowToTransaction(row);
  transactionDialogBody.innerHTML = `
    <dl class="transaction-detail">
      <div><dt>Kuupäev</dt><dd>${transaction.date}</dd></div>
      <div><dt>Kategooria</dt><dd>${transaction.category}</dd></div>
      <div><dt>Märkus</dt><dd>${transaction.note || "—"}</dd></div>
      <div><dt>Summa</dt><dd>${formatEUR(transaction.amount)}</dd></div>
    </dl>
  `;
  openDialog(transactionDialog, row);
}

function openDialog(dialog, trigger) {
  if (!dialog) return;
  setupDialog(dialog);
  dialog.addEventListener("close", () => releaseFocus(dialog), { once: true });
  if (!dialog.open) {
    dialog.showModal();
  }
  trapFocus(dialog);
  dialog.dataset.returnFocusId = trigger?.id || "";
}

function setupDialog(dialog) {
  if (!dialog || dialog.dataset.enhanced) return;
  dialog.dataset.enhanced = "true";
  dialog.addEventListener("cancel", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  dialog.addEventListener("close", () => {
    const returnId = dialog.dataset.returnFocusId;
    if (returnId) {
      const trigger = document.getElementById(returnId);
      trigger?.focus();
      dialog.dataset.returnFocusId = "";
    }
  });
}

function updateMonthLabel() {
  if (!monthDisplay) return;
  const label = `${MONTH_LABELS[activeMonth.getMonth()]} ${activeMonth.getFullYear()}`;
  monthDisplay.textContent = label;
}

function formatExpenseInput() {
  if (!expenseAmount) return;
  const value = parseNumber(expenseAmount.value);
  if (!value) return;
  expenseAmount.value = formatEUR(value);
}

function setError(message) {
  if (!expenseAmount || !expenseError) return;
  expenseAmount.setAttribute("aria-invalid", "true");
  expenseError.hidden = false;
  expenseError.textContent = message;
}

function clearError() {
  if (!expenseAmount || !expenseError) return;
  expenseAmount.removeAttribute("aria-invalid");
  expenseError.hidden = true;
  expenseError.textContent = "";
}

function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

function scheduleShadowUpdate() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    updateScrollShadows();
  });
}

function updateScrollShadows() {
  if (!tableScroll) return;
  const { scrollLeft, scrollWidth, clientWidth } = tableScroll;
  const atStart = scrollLeft <= 0;
  const atEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth;
  toggleShadow("left", !atStart);
  toggleShadow("right", !atEnd);
}

function toggleShadow(side, visible) {
  const shadow = document.querySelector(`.scroll-shadow--${side}`);
  if (!shadow) return;
  shadow.style.opacity = visible ? "1" : "0";
  shadow.style.transition = prefersReducedMotion() ? "none" : "opacity 0.2s ease";
}

function rowToTransaction(row) {
  const date = row.cells[0]?.textContent?.trim() || "";
  const category = row.cells[1]?.textContent?.trim() || "";
  const note = row.querySelector(".col-notes")?.textContent?.trim() || "";
  const amountCell = row.querySelector("[data-amount]");
  const amount = Number(amountCell?.dataset.amount || 0);
  return { id: row.dataset.id || "", date, category, note, amount };
}

function parseNumber(value) {
  if (!value) return 0;
  const normalised = value.toString().replace(/[^0-9,-]/g, "").replace(",", ".");
  return Number(normalised);
}

function formatISODate(date) {
  if (!(date instanceof Date)) return date;
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function debounce(fn, delay = 120) {
  let timeout;
  return (value) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(value), delay);
  };
}

function queueIdle(task) {
  if (typeof task !== "function") return;
  const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 0));
  idle(task);
}
