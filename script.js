// DOM Elements
const difficultySelect = document.getElementById('difficulty');
const startBtn = document.getElementById('start-btn');
const textDisplay = document.getElementById('text-display');
const textInput = document.getElementById('text-input');
const timer = document.querySelector('.timer');
const wpmDisplay = document.getElementById('wpm');
const accuracyDisplay = document.getElementById('accuracy');
const resultWpm = document.getElementById('result-wpm');
const resultAccuracy = document.getElementById('result-accuracy');
const resultChars = document.getElementById('result-chars');
const restartBtn = document.getElementById('restart-btn');
const settingsContainer = document.querySelector('.settings');
const mainContainer = document.querySelector('.main');
const resultContainer = document.querySelector('.result');

// Sound effects
const errorSound = new Audio('sounds/error.wav');
const successSound = new Audio('sounds/success.wav');

// Game variables
let currentText = '';
let timeLeft = 60;
let timer_interval;
let charIndex = 0;
let mistakes = 0;
let isTyping = false;
let totalTyped = 0;
let isLoading = false;

// Fallback text samples by difficulty (in case API fails)
const fallbackTextSamples = {
    easy: [
        "The quick brown fox jumps over the lazy dog. Simple sentences are easy to type.",
        "I enjoy reading books in my free time. What about you? Do you like reading too?",
        "Today is a beautiful day. The sun is shining and the birds are singing happily.",
        "Learning to type quickly is an important skill in today's digital world.",
        "Practice makes perfect. Keep typing to improve your speed and accuracy."
    ],
    medium: [
        "The ability to type quickly and accurately is becoming increasingly important in our technology-driven world. Many jobs require employees to have good typing skills.",
        "According to research, the average typing speed is around 40 words per minute. Professional typists can reach speeds of 65 to 75 words per minute.",
        "The QWERTY keyboard layout was designed in the 1870s for mechanical typewriters. Despite newer, more efficient layouts, QWERTY remains the standard today.",
        "Touch typing is the ability to type without looking at the keyboard. This skill can significantly increase your typing speed and reduce errors.",
        "Regular practice is essential for improving typing speed. Just 15-30 minutes of daily practice can lead to substantial improvements over time."
    ],
    hard: [
        "The intricate mechanisms of quantum computing leverage the principles of quantum mechanics to process information in ways that classical computers cannot. This revolutionary approach has the potential to solve complex problems exponentially faster.",
        "Neuroplasticity refers to the brain's remarkable ability to reorganize itself by forming new neural connections throughout life. This phenomenon enables the neurons in the brain to compensate for injury and disease and to adjust their activities in response to new situations or changes in their environment.",
        "The biodiversity of tropical rainforests is unparalleled, with these ecosystems housing approximately 50% of Earth's plant and animal species despite covering less than 6% of the planet's surface. The complex interrelationships between species create a delicate balance that is increasingly threatened by human activities.",
        "Artificial intelligence algorithms are becoming increasingly sophisticated, with deep learning models capable of recognizing patterns and making decisions with minimal human intervention. These advancements raise important ethical questions about autonomy, privacy, and the future of human-machine interaction.",
        "The global financial system is an intricate network of institutions, markets, and economic policies that facilitate international trade and investment. Understanding its complexities requires knowledge of monetary policy, exchange rates, and the interconnectedness of national economies."
    ],
    expert: [
        "The juxtaposition of seemingly disparate philosophical paradigms—existentialism and pragmatism—reveals unexpected convergences in their approaches to authenticity and practical engagement with the world. Philosophers like Sartre and Dewey, despite their methodological differences, both emphasize the significance of individual agency in constructing meaningful existence within social contexts.",
        "Quantum entanglement, a phenomenon Einstein famously referred to as 'spooky action at a distance,' demonstrates that paired quantum particles instantaneously affect one another regardless of the distance separating them, challenging our fundamental understanding of locality and suggesting that information can travel faster than light—a notion that contradicts special relativity.",
        "The anthropogenic acceleration of the carbon cycle through industrial emissions has precipitated unprecedented perturbations in global climate systems, manifesting in increased frequency of extreme weather events, thermal expansion of oceans, and disruption of ecosystems that have evolved within relatively stable Holocene parameters.",
        "The emergence of cryptocurrency as a decentralized financial instrument represents a paradigm shift in our conceptualization of monetary systems, potentially undermining traditional banking infrastructures while simultaneously introducing novel vulnerabilities in cybersecurity and regulatory oversight that were previously nonexistent.",
        "Contemporary linguistic theory has evolved beyond the Chomskyan notion of universal grammar toward more nuanced models that incorporate cultural transmission, statistical learning, and the co-evolution of language with human cognitive capacities, suggesting that language acquisition emerges from complex interactions between innate predispositions and environmental input."
    ]
};

// API configuration for different text generation services
const apiConfig = {
    // Random Quotes API
    quotable: {
        url: 'https://api.quotable.io/quotes/random',
        params: {
            easy: { minLength: 50, maxLength: 100 },
            medium: { minLength: 100, maxLength: 200 },
            hard: { minLength: 200, maxLength: 300 },
            expert: { minLength: 300, maxLength: 500 }
        },
        processResponse: (data) => {
            if (data && data.length > 0) {
                return `${data[0].content} - ${data[0].author}`;
            }
            return null;
        }
    },
    // Random Sentences API
    sentenceGenerator: {
        url: 'https://random-word-api.herokuapp.com/sentence',
        params: {
            easy: { number: 3 },
            medium: { number: 5 },
            hard: { number: 8 },
            expert: { number: 12 }
        },
        processResponse: (data) => {
            if (data) {
                return data;
            }
            return null;
        }
    },
    // Bacon Ipsum API (Lorem Ipsum with a meat theme)
    baconIpsum: {
        url: 'https://baconipsum.com/api/',
        params: {
            easy: { type: 'all-meat', sentences: 2, 'start-with-lorem': 1 },
            medium: { type: 'all-meat', sentences: 4, 'start-with-lorem': 1 },
            hard: { type: 'meat-and-filler', sentences: 6, 'start-with-lorem': 1 },
            expert: { type: 'meat-and-filler', sentences: 10, 'start-with-lorem': 1 }
        },
        processResponse: (data) => {
            if (data && data.length > 0) {
                return data[0];
            }
            return null;
        }
    },
    // Lorem Ipsum API
    loremIpsum: {
        url: 'https://loripsum.net/api/1/short/plaintext',
        params: {
            easy: { url: 'https://loripsum.net/api/1/short/plaintext' },
            medium: { url: 'https://loripsum.net/api/1/medium/plaintext' },
            hard: { url: 'https://loripsum.net/api/2/medium/plaintext' },
            expert: { url: 'https://loripsum.net/api/2/long/plaintext' }
        },
        processResponse: (data) => {
            if (data) {
                return data.trim();
            }
            return null;
        }
    }
};

// Initialize the game
function init() {
    startBtn.addEventListener('click', startGame);
    textInput.addEventListener('input', processTyping);
    restartBtn.addEventListener('click', resetGame);
}

// Start the typing test
async function startGame() {
    const difficulty = difficultySelect.value;
    
    // Show loading state
    startBtn.disabled = true;
    startBtn.textContent = 'Loading...';
    isLoading = true;
    
    try {
        // Try to get text from API
        currentText = await fetchRandomText(difficulty);
    } catch (error) {
        console.error('Error fetching text from API:', error);
        // Fallback to local text samples
        currentText = getFallbackText(difficulty);
    }
    
    // Reset loading state
    startBtn.disabled = false;
    startBtn.textContent = 'Start Test';
    isLoading = false;
    
    // Display text with character spans for tracking
    textDisplay.innerHTML = '';
    currentText.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.innerText = char;
        textDisplay.appendChild(charSpan);
    });
    
    // Reset variables
    charIndex = 0;
    mistakes = 0;
    isTyping = true;
    totalTyped = 0;
    timeLeft = 60;
    
    // Update UI
    textInput.value = '';
    timer.innerText = timeLeft;
    wpmDisplay.innerText = '0';
    accuracyDisplay.innerText = '100%';
    
    // Show game UI
    settingsContainer.classList.add('hidden');
    mainContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    // Focus on input
    textInput.disabled = false;
    textInput.focus();
    
    // Start timer
    startTimer();
}

// Fetch random text from API based on difficulty
async function fetchRandomText(difficulty) {
    // Select a random API from our configuration
    const apiKeys = Object.keys(apiConfig);
    const randomApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const api = apiConfig[randomApiKey];
    
    // Special case for Lorem Ipsum API which uses different URLs instead of query params
    if (randomApiKey === 'loremIpsum') {
        const response = await fetch(api.params[difficulty].url);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.text();
        const processedText = api.processResponse(data);
        if (processedText) {
            return processedText;
        }
        throw new Error('Failed to process API response');
    }
    
    // For other APIs that use query parameters
    const params = new URLSearchParams(api.params[difficulty]);
    const response = await fetch(`${api.url}?${params.toString()}`);
    
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const processedText = api.processResponse(data);
    
    if (processedText) {
        return processedText;
    }
    
    throw new Error('Failed to process API response');
}

// Get fallback text if API fails
function getFallbackText(difficulty) {
    const texts = fallbackTextSamples[difficulty];
    return texts[Math.floor(Math.random() * texts.length)];
}

// Start the countdown timer
function startTimer() {
    timer_interval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            timer.innerText = timeLeft;
            calculateWPM();
        } else {
            endGame();
        }
    }, 1000);
}

// Process user typing
function processTyping() {
    const typedText = textInput.value;
    const currentChar = currentText.charAt(charIndex);
    
    if (charIndex < currentText.length) {
        totalTyped++;
        
        // Get all character spans
        const chars = textDisplay.querySelectorAll('span');
        
        // Check if the typed character matches the current character
        if (typedText.charAt(charIndex) === currentChar) {
            chars[charIndex].classList.add('correct');
            chars[charIndex].classList.remove('incorrect');
        } else {
            chars[charIndex].classList.add('incorrect');
            chars[charIndex].classList.remove('correct');
            mistakes++;
            
            // Play error sound when typing mistake occurs
            errorSound.currentTime = 0;
            errorSound.play().catch(e => console.log('Error playing sound:', e));
        }
        
        // Move to next character
        charIndex++;
        
        // Update current character highlight
        if (charIndex < chars.length) {
            chars.forEach(char => char.classList.remove('current'));
            chars[charIndex].classList.add('current');
        }
        
        // Calculate and update stats
        calculateWPM();
        updateAccuracy();
        
        // Check if text is complete
        if (charIndex >= currentText.length) {
            endGame();
        }
    }
}

// Calculate words per minute
function calculateWPM() {
    // WPM formula: (characters typed / 5) / time in minutes
    // 5 characters is considered as one word
    const timeElapsed = (60 - timeLeft) / 60; // Convert to minutes
    if (timeElapsed > 0) {
        const wordsTyped = charIndex / 5;
        const wpm = Math.round(wordsTyped / timeElapsed);
        wpmDisplay.innerText = wpm;
    }
}

// Update accuracy percentage
function updateAccuracy() {
    if (totalTyped > 0) {
        const accuracy = Math.round(((totalTyped - mistakes) / totalTyped) * 100);
        accuracyDisplay.innerText = `${accuracy}%`;
    }
}

// End the typing test
function endGame() {
    clearInterval(timer_interval);
    textInput.disabled = true;
    isTyping = false;
    
    // Calculate final stats
    const timeElapsed = (60 - timeLeft) / 60;
    const wordsTyped = charIndex / 5;
    const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
    const accuracy = totalTyped > 0 ? Math.round(((totalTyped - mistakes) / totalTyped) * 100) : 100;
    
    // Update result screen
    resultWpm.innerText = wpm;
    resultAccuracy.innerText = `${accuracy}%`;
    resultChars.innerText = `${charIndex - mistakes}/${charIndex}`;
    
    // Play success sound when showing results
    successSound.currentTime = 0;
    successSound.play().catch(e => console.log('Error playing sound:', e));
    
    // Show result screen
    mainContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
}

// Reset the game to start screen
function resetGame() {
    clearInterval(timer_interval);
    settingsContainer.classList.remove('hidden');
    mainContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
}

// Initialize when page loads
window.addEventListener('load', init);
