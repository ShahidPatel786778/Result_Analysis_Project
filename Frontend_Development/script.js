const form = document.getElementById("loginForm");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("loginMessage");

    msg.textContent = "";

    if (!userId || !password) {
        msg.textContent = "Enter User ID and password.";
        msg.style.color = "#dc2626";
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, password })
        });

        const data = await response.text();

        if (!response.ok) {
            msg.textContent = data || "Invalid User ID or password.";
            msg.style.color = "#dc2626";
            return;
        }

        if (data.trim() === "Login Successful" || data.trim() === "HOD_LOGIN_SUCCESS") {
            localStorage.setItem("userId", userId);
            localStorage.setItem("userRole", data.trim() === "HOD_LOGIN_SUCCESS" ? "HOD" : "STUDENT");

            msg.textContent = "Login successful.";
            msg.style.color = "#15803d";

            setTimeout(() => {
                window.location.href = "home.html";
            }, 500);

        }

        else {
            msg.textContent = data || "Invalid User ID or password.";
            msg.style.color = "#dc2626";
        }

    } catch (error) {
        console.error(error);
        msg.textContent = "Cannot connect to backend.";
        msg.style.color = "#dc2626";
    }
});

document.getElementById("createAccount").addEventListener("click", () => {
    window.location.href = "register.html";
});
