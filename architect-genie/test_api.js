
// using native fetch

const apiKey = "AIzaSyBW1vImuh9aqkl_8AJBf2O7DZ1mMjvVyVY";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

// 1x1 Transparent PNG Base64
const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

const payload = {
    contents: [{
        parts: [
            { text: "Describe this image" },
            { inlineData: { mimeType: "image/png", data: base64Image } }
        ]
    }],
    generationConfig: {
        // responseModalities: ["TEXT", "IMAGE"] // Testing if this is the issue
    }
};

console.log("Testing Gemini API...");
console.log(`URL: ${apiUrl}`);

try {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP Error: ${response.status}`);
        console.error(`Response: ${errorText}`);
    } else {
        const data = await response.json();
        console.log("Success!");
        console.log(JSON.stringify(data, null, 2));
    }
} catch (error) {
    console.error("Fetch Error:", error);
}
