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
        const correctOptionInput = document.querySelector('input[name="correct-option"]:checked');
        const explanationText = document.getElementById('explanation-text').value;

        if (!correctOptionInput) {
            alert('Please select the correct answer.');
            return;
        }

        const parsed = parseRawQuestion(rawText);
        
        if (!parsed) {
            alert('Could not automatically parse the options. Please ensure the text contains A., B., C., D. correctly.');
            return;
        }

        const correctIndex = parseInt(correctOptionInput.value);

        const newQuestion = {
            text: parsed.question,
            options: parsed.options,
            correctIndex: correctIndex,
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
        const regexA = /(?:^|\n)\s*A[\.\)]\s/;
        const regexB = /(?:^|\n)\s*B[\.\)]\s/;
        const regexC = /(?:^|\n)\s*C[\.\)]\s/;
        const regexD = /(?:^|\n)\s*D[\.\)]\s/;

        const matchA = text.match(regexA);
        const matchB = text.match(regexB);
        const matchC = text.match(regexC);
        const matchD = text.match(regexD);

        if (!matchA || !matchB || !matchC || !matchD) return null;

        const idxA = matchA.index;
        const idxB = matchB.index;
        const idxC = matchC.index;
        const idxD = matchD.index;

        const question = text.substring(0, idxA).trim();
        const optA = text.substring(idxA + matchA[0].length, idxB).trim();
        const optB = text.substring(idxB + matchB[0].length, idxC).trim();
        const optC = text.substring(idxC + matchC[0].length, idxD).trim();
        const optD = text.substring(idxD + matchD[0].length).trim();

        return {
            question: question,
            options: [optA, optB, optC, optD]
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
                    if (answered) return;
                    answered = true;

                    const allOptions = optionsList.querySelectorAll('.quiz-option');
                    allOptions.forEach((optEl, i) => {
                        if (i === q.correctIndex) {
                            optEl.classList.add('correct');
                            optEl.querySelector('.indicator').innerHTML = '✓';
                        } else if (i === optIndex) {
                            optEl.classList.add('incorrect');
                            optEl.querySelector('.indicator').innerHTML = '✗';
                        }
                    });

                    explanationDiv.classList.add('show');
                });

                optionsList.appendChild(li);
            });
            cardContent.appendChild(optionsList);

            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation-box';
            if (q.explanation && q.explanation.trim() !== '') {
                explanationDiv.innerHTML = `<h4>Explanation</h4><p>${q.explanation.replace(/\n/g, '<br>')}</p>`;
            } else {
                explanationDiv.innerHTML = `<h4>Correct Answer: ${String.fromCharCode(65 + q.correctIndex)}</h4>`;
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
