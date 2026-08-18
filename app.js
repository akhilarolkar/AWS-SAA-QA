import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ⚠️ PASTE YOUR FIREBASE CONFIG OBJECT HERE:
// ==========================================
// const firebaseConfig = {
//   // apiKey: "YOUR_API_KEY",
//   // authDomain: "YOUR_AUTH_DOMAIN",
//   // projectId: "YOUR_PROJECT_ID",
//   // storageBucket: "YOUR_STORAGE_BUCKET",
//   // messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   // appId: "YOUR_APP_ID"
// };

  const firebaseConfig = {
    apiKey: "AIzaSyC_rxwVR6Hbn4ZBc7GaeY1JLFQ9hwr8qL0",
    authDomain: "aws-saa-qa.firebaseapp.com",
    projectId: "aws-saa-qa",
    storageBucket: "aws-saa-qa.firebasestorage.app",
    messagingSenderId: "1040021278904",
    appId: "1:1040021278904:web:166abd3d9a082f9a16e44d",
    measurementId: "G-RWNPS26JPK"
  };

let db = null;

// Initialize Firebase (wrapped in a try-catch so the app doesn't crash if config is empty)
try {
    if (firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    }
} catch (error) {
    console.error("Firebase initialization error.", error);
}

document.addEventListener('DOMContentLoaded', () => {
    const questionForm = document.getElementById('question-form');
    const questionsContainer = document.getElementById('questions-container');
    const paginationControls = document.getElementById('pagination-controls');

    let questions = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Real-time listener for Firestore
    if (db) {
        const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            questions = [];
            snapshot.forEach((documentSnapshot) => {
                questions.push({ id: documentSnapshot.id, ...documentSnapshot.data() });
            });
            const totalPages = Math.ceil(questions.length / itemsPerPage);
            if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
            renderQuestions();
        }, (error) => {
            console.error("Error fetching questions: ", error);
            questionsContainer.innerHTML = '<div class="empty-state">Error connecting to database. Please check your Firebase permissions/config.</div>';
        });
    } else {
        questionsContainer.innerHTML = '<div class="empty-state" style="color: #ef4444;">Firebase is not configured! Open app.js and paste your firebaseConfig block at the top.</div>';
    }

    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!db) {
            alert('Firebase is not configured yet! Open app.js and paste your config block at the very top.');
            return;
        }

        const rawText = document.getElementById('raw-text').value;
        const correctOptionInputs = document.querySelectorAll('input[name="correct-option"]:checked');
        const explanationText = document.getElementById('explanation-text').value;

        if (correctOptionInputs.length === 0) {
            alert('Please select at least one correct answer.');
            return;
        }

        const parsed = parseRawQuestion(rawText);
        
        if (!parsed) {
            alert('Could not automatically parse the options. Please ensure the text contains A., B., C., D. correctly.');
            return;
        }

        const correctIndexes = Array.from(correctOptionInputs).map(input => parseInt(input.value));

        const newQuestion = {
            text: parsed.question,
            options: parsed.options,
            correctIndexes: correctIndexes,
            explanation: explanationText,
            createdAt: serverTimestamp() // Let Firebase handle the timestamp automatically
        };

        try {
            // Save directly to the cloud
            await addDoc(collection(db, "questions"), newQuestion);
            questionForm.reset();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert('Error adding question to database. Make sure your Firestore rules allow writing.');
        }
    });

    function parseRawQuestion(text) {
        const regexes = [
            /(?:^|\n)\s*A[\.\)]\s/,
            /(?:^|\n)\s*B[\.\)]\s/,
            /(?:^|\n)\s*C[\.\)]\s/,
            /(?:^|\n)\s*D[\.\)]\s/,
            /(?:^|\n)\s*E[\.\)]\s/,
            /(?:^|\n)\s*F[\.\)]\s/
        ];

        const matches = regexes.map(r => text.match(r));

        if (!matches[0] || !matches[1]) return null;

        const options = [];
        const questionEndIndex = matches[0].index;
        const question = text.substring(0, questionEndIndex).trim();

        for (let i = 0; i < matches.length; i++) {
            if (!matches[i]) break;
            
            const startIndex = matches[i].index + matches[i][0].length;
            
            // Find the end index which is either the start of the next match or the end of the string
            let endIndex = text.length;
            for (let j = i + 1; j < matches.length; j++) {
                if (matches[j]) {
                    endIndex = matches[j].index;
                    break;
                }
            }
            
            options.push(text.substring(startIndex, endIndex).trim());
        }

        return {
            question: question,
            options: options
        };
    }

    function renderQuestions() {
        questionsContainer.innerHTML = '';
        if (paginationControls) paginationControls.innerHTML = '';

        if (questions.length === 0) {
            questionsContainer.innerHTML = '<div class="empty-state">No questions added yet. Start building your study bank!</div>';
            return;
        }

        const totalPages = Math.ceil(questions.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const currentQuestions = questions.slice(startIndex, startIndex + itemsPerPage);

        currentQuestions.forEach((q, index) => {
            const absoluteIndex = startIndex + index;
            const card = document.createElement('div');
            card.className = 'question-card collapsed';
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const questionHeader = document.createElement('h3');
            questionHeader.innerText = `Q${questions.length - absoluteIndex}: ${q.text}`;
            
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'toggle-icon';
            toggleIcon.innerHTML = '▼';
            
            cardHeader.appendChild(questionHeader);
            cardHeader.appendChild(toggleIcon);
            card.appendChild(cardHeader);

            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';

            cardHeader.addEventListener('click', () => {
                const isCollapsed = card.classList.toggle('collapsed');
                toggleIcon.innerHTML = isCollapsed ? '▼' : '▲';
            });

            const optionsList = document.createElement('ul');
            optionsList.className = 'quiz-options';
            
            let answered = false;
            const optionsArray = q.options || [];
            
            const correctAnswers = q.correctIndexes || (q.correctIndex !== undefined ? [q.correctIndex] : []);
            let selectedCorrectCount = 0;
            let hasAnsweredWrong = false;

            optionsArray.forEach((optText, optIndex) => {
                const li = document.createElement('li');
                li.className = 'quiz-option';
                
                const indicator = document.createElement('span');
                indicator.className = 'indicator';
                indicator.innerHTML = String.fromCharCode(65 + optIndex);
                
                const textNode = document.createTextNode(optText);
                
                li.appendChild(indicator);
                li.appendChild(textNode);

                li.addEventListener('click', () => {
                    if (answered || li.classList.contains('correct') || li.classList.contains('incorrect')) return;

                    if (correctAnswers.includes(optIndex)) {
                        li.classList.add('correct');
                        li.querySelector('.indicator').innerHTML = '✓';
                        selectedCorrectCount++;
                    } else {
                        li.classList.add('incorrect');
                        li.querySelector('.indicator').innerHTML = '✗';
                        hasAnsweredWrong = true;
                    }

                    // Show explanation if they got it wrong, or if they found all correct options
                    if (hasAnsweredWrong || selectedCorrectCount === correctAnswers.length) {
                        answered = true;
                        
                        // Reveal all remaining options
                        const allOptions = optionsList.querySelectorAll('.quiz-option');
                        allOptions.forEach((optEl, i) => {
                            if (correctAnswers.includes(i) && !optEl.classList.contains('correct')) {
                                optEl.classList.add('correct');
                                optEl.querySelector('.indicator').innerHTML = '✓';
                            }
                        });

                        explanationDiv.classList.add('show');
                    }
                });

                optionsList.appendChild(li);
            });
            cardContent.appendChild(optionsList);

            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation-box';
            if (q.explanation && q.explanation.trim() !== '') {
                explanationDiv.innerHTML = `<h4>Explanation</h4><p>${q.explanation.replace(/\n/g, '<br>')}</p>`;
            } else {
                const correctLetters = correctAnswers.map(idx => String.fromCharCode(65 + idx)).join(', ');
                explanationDiv.innerHTML = `<h4>Correct Answer: ${correctLetters}</h4>`;
            }
            cardContent.appendChild(explanationDiv);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerText = 'Delete Question';
            deleteBtn.addEventListener('click', async () => {
                if(confirm('Are you sure you want to delete this question?')) {
                    try {
                        // Delete from the cloud!
                        await deleteDoc(doc(db, "questions", q.id));
                    } catch (error) {
                        console.error("Error deleting document: ", error);
                        alert('Error deleting question. Check Firestore permissions.');
                    }
                }
            });
            cardContent.appendChild(deleteBtn);

            card.appendChild(cardContent);
            questionsContainer.appendChild(card);
        });

        renderPaginationControls(totalPages);
    }

    function renderPaginationControls(totalPages) {
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.innerText = 'Previous';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderQuestions();
            }
        });

        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.innerText = 'Next';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderQuestions();
            }
        });

        if(paginationControls) {
            paginationControls.appendChild(prevBtn);
            paginationControls.appendChild(pageInfo);
            paginationControls.appendChild(nextBtn);
        }
    }
});
