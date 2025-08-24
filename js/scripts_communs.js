document.addEventListener("DOMContentLoaded", function () {
    // Charge script.js
    const script_01 = document.createElement("script");
    script_01.src = "/js/script.js";
    document.body.appendChild(script_01);

    // Charge header_and_footer.js
    const script_h_a_f = document.createElement("script");
    script_h_a_f.src = "/js/header_and_footer.js";
    document.body.appendChild(script_h_a_f);
});


