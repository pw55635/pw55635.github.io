class Todo {
    constructor(table) {
        this.tableBody = table.querySelector("tbody");
        this.taskInput = document.querySelector("#new-task");
        this.dueDateInput = document.querySelector("#task-due-date");
        this.searchInput = document.querySelector("#task-search");
        this.addButton = document.querySelector("#add-task");
        this.storageKey = "todo-positions";
        this.nextTaskId = 4;
        this.dueDateInput.min = this.getTodayDate();

        this.addButton.addEventListener("click", () => {
            this.addPosition(this.taskInput.value, this.dueDateInput.value);
        });

        this.tableBody.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action]");
            if (!button) return;

            const row = button.closest("tr");
            if (button.dataset.action === "delete") {
                this.removePosition(row);
            } else if (button.dataset.action === "edit") {
                this.startEditing(row);
            } else if (button.dataset.action === "save") {
                const description = row.querySelector("[data-edit-description]").value;
                const dueDate = row.querySelector("[data-edit-due-date]").value;
                this.editPosition(row, description, dueDate);
            } else if (button.dataset.action === "cancel") {
                this.cancelEditing(row);
            }
        });

        this.tableBody.addEventListener("change", (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                this.savePositions();
            }
        });

        this.searchInput.addEventListener("input", () => this.filterPositions());
        this.loadPositions();
    }

    addPosition(description, dueDate = "") {
        const normalizedDescription = description.trim();
        if (!normalizedDescription) {
            this.taskInput.setCustomValidity("Enter a task description.");
            this.taskInput.reportValidity();
            this.taskInput.focus();
            return;
        }

        this.dueDateInput.min = this.getTodayDate();
        if (!this.validateDueDate(this.dueDateInput, dueDate)) return;

        this.taskInput.setCustomValidity("");
        const row = document.createElement("tr");
        row.className = "task";
        this.createTaskCells(row, normalizedDescription, dueDate);
        this.tableBody.insertBefore(row, this.tableBody.querySelector(".task-entry"));
        this.taskInput.value = "";
        this.dueDateInput.value = "";
        this.savePositions();
        this.filterPositions();
    }

    removePosition(row) {
        row.remove();
        this.savePositions();
    }

    editPosition(row, description, dueDate = "") {
        const normalizedDescription = description.trim();
        const descriptionInput = row.querySelector("[data-edit-description]");
        if (!normalizedDescription) {
            descriptionInput.setCustomValidity("Enter a task description.");
            descriptionInput.reportValidity();
            descriptionInput.focus();
            return;
        }

        const dueDateInput = row.querySelector("[data-edit-due-date]");
        dueDateInput.min = this.getTodayDate();
        if (!this.validateDueDate(dueDateInput, dueDate)) return;

        descriptionInput.setCustomValidity("");
        const completed = row.querySelector('input[type="checkbox"]').checked;
        row.replaceChildren();
        this.createTaskCells(row, normalizedDescription, dueDate, completed);
        this.savePositions();
        this.filterPositions();
    }

    startEditing(row) {
        if (row.querySelector("[data-edit-description]")) return;

        const label = row.querySelector("label");
        const checkbox = row.querySelector('input[type="checkbox"]');
        const time = row.querySelector("time");
        const description = label.textContent;
        const dueDate = time ? time.dateTime : "";

        const descriptionCell = row.cells[0];
        descriptionCell.replaceChildren();
        const descriptionInput = document.createElement("input");
        descriptionInput.type = "text";
        descriptionInput.value = description;
        descriptionInput.defaultValue = description;
        descriptionInput.setAttribute("aria-label", "Task description");
        descriptionInput.dataset.editDescription = "";
        descriptionCell.append(checkbox, descriptionInput);

        const dateCell = row.cells[1];
        dateCell.replaceChildren();
        const dateInput = document.createElement("input");
        dateInput.type = "date";
        dateInput.value = dueDate;
        dateInput.defaultValue = dueDate;
        dateInput.min = this.getTodayDate();
        dateInput.required = true;
        dateInput.setAttribute("aria-label", "Due date");
        dateInput.dataset.editDueDate = "";
        dateCell.append(dateInput);

        const actionsCell = row.cells[2];
        actionsCell.replaceChildren(
            this.createButton("Save", "save"),
            this.createButton("Cancel", "cancel"),
            this.createButton("Delete", "delete")
        );
        descriptionInput.focus();
    }

    cancelEditing(row) {
        const description = row.querySelector("[data-edit-description]").defaultValue;
        const dueDate = row.querySelector("[data-edit-due-date]").defaultValue;
        const completed = row.querySelector('input[type="checkbox"]').checked;
        row.replaceChildren();
        this.createTaskCells(row, description, dueDate, completed);
        this.savePositions();
        this.filterPositions();
    }

    createTaskCells(row, description, dueDate, completed = false) {
        const descriptionCell = document.createElement("td");
        const checkbox = document.createElement("input");
        const checkboxId = `task-${this.nextTaskId++}`;
        checkbox.type = "checkbox";
        checkbox.name = "completed";
        checkbox.id = checkboxId;
        checkbox.checked = completed;

        const label = document.createElement("label");
        label.htmlFor = checkboxId;
        label.textContent = description;
        descriptionCell.append(checkbox, label);

        const dateCell = document.createElement("td");
        if (dueDate) {
            const time = document.createElement("time");
            time.dateTime = dueDate;
            time.textContent = new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC"
            }).format(new Date(`${dueDate}T00:00:00Z`));
            dateCell.append(time);
        }

        const actionsCell = document.createElement("td");
        actionsCell.className = "task-actions";
        actionsCell.append(
            this.createButton("Edit", "edit", `Edit ${description}`),
            this.createButton("Delete", "delete", `Delete ${description}`)
        );
        row.append(descriptionCell, dateCell, actionsCell);
    }

    createButton(text, action, label = text) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.dataset.action = action;
        button.setAttribute("aria-label", label);
        return button;
    }

    getTodayDate() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${today.getFullYear()}-${month}-${day}`;
    }

    validateDueDate(input, dueDate = input.value) {
        input.setCustomValidity("");
        if (!dueDate) {
            input.setCustomValidity("Select a due date.");
        } else if (dueDate < this.getTodayDate()) {
            input.setCustomValidity("Due date cannot be in the past.");
        }

        if (input.validity.valid) return true;
        input.reportValidity();
        input.focus();
        return false;
    }

    loadPositions() {
        const storedPositions = localStorage.getItem(this.storageKey);
        if (storedPositions === null) {
            this.savePositions();
            this.filterPositions();
            return;
        }

        const positions = JSON.parse(storedPositions);
        if (!Array.isArray(positions) || positions.some((position) =>
            !position ||
            typeof position.description !== "string" ||
            typeof position.dueDate !== "string" ||
            typeof position.completed !== "boolean"
        )) {
            throw new Error("Saved to-do list data has an invalid format.");
        }

        this.tableBody.querySelectorAll(".task").forEach((row) => row.remove());
        positions.forEach((position) => {
            const row = document.createElement("tr");
            row.className = "task";
            this.createTaskCells(
                row,
                position.description,
                position.dueDate,
                position.completed
            );
            this.tableBody.insertBefore(row, this.tableBody.querySelector(".task-entry"));
        });
        this.filterPositions();
    }

    savePositions() {
        const positions = Array.from(this.tableBody.querySelectorAll(".task"), (row) => {
            const descriptionInput = row.querySelector("[data-edit-description]");
            const label = row.querySelector("label");
            const dueDateInput = row.querySelector("[data-edit-due-date]");
            const time = row.querySelector("time");

            return {
                description: descriptionInput ? descriptionInput.defaultValue : label.textContent,
                dueDate: dueDateInput ? dueDateInput.defaultValue : time ? time.dateTime : "",
                completed: row.querySelector('input[type="checkbox"]').checked
            };
        });
        localStorage.setItem(this.storageKey, JSON.stringify(positions));
    }

    filterPositions() {
        const query = this.searchInput.value.trim().toLocaleLowerCase();
        this.tableBody.querySelectorAll(".task").forEach((row) => {
            const descriptionInput = row.querySelector("[data-edit-description]");
            const label = row.querySelector("label");
            const description = descriptionInput ? descriptionInput.value : label.textContent;
            const time = row.querySelector("time");
            const dueDateInput = row.querySelector("[data-edit-due-date]");
            const dueDate = time?.textContent ?? dueDateInput?.value ?? "";
            const searchableText = `${description} ${dueDate}`.toLocaleLowerCase();
            row.hidden = query !== "" && !searchableText.includes(query);

            if (label) this.highlightMatches(label, query);
            if (time) this.highlightMatches(time, query);
        });
    }

    highlightMatches(element, query) {
        const text = element.textContent;
        const normalizedText = text.toLocaleLowerCase();
        const normalizedQuery = query.toLocaleLowerCase();
        const fragment = document.createDocumentFragment();
        let currentIndex = 0;
        let matchIndex = normalizedQuery ? normalizedText.indexOf(normalizedQuery) : -1;

        while (matchIndex !== -1) {
            fragment.append(document.createTextNode(text.slice(currentIndex, matchIndex)));
            const mark = document.createElement("mark");
            mark.textContent = text.slice(matchIndex, matchIndex + query.length);
            fragment.append(mark);
            currentIndex = matchIndex + query.length;
            matchIndex = normalizedText.indexOf(normalizedQuery, currentIndex);
        }

        fragment.append(document.createTextNode(text.slice(currentIndex)));
        element.replaceChildren(fragment);
    }
}

new Todo(document.querySelector(".task-list"));
