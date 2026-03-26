import dotenv from "dotenv";
import OpenAI from "openai";
import chalk from "chalk";
import readlineSync from "readline-sync";

dotenv.config();

const client = new OpenAI({
  baseURL: "https://models.github.ai/inference/",
  apiKey: process.env.GITHUB_TOKEN,
});

async function generateQuizQuestions() {
  const prompt = `
Generate exactly 10 multiple-choice quiz questions about world geography.

Rules:
- Each question must have exactly 4 answer options.
- Only one answer is correct.
- Make the questions clear and suitable for a CLI quiz game.
- Return ONLY valid JSON.
- Do not include markdown code fences.
- Do not include any explanation before or after the JSON.

Use this exact JSON format:
[
  {
    "question": "Which country has the city of Kyoto?",
    "options": ["China", "Japan", "South Korea", "Thailand"],
    "correctAnswer": 2
  }
]

Important:
- "correctAnswer" must be a number from 1 to 4.
- Return exactly 10 question objects.
`;

  const response = await client.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const text = response.choices[0].message.content;

  try {
    const questions = JSON.parse(text);

    const isValid =
      Array.isArray(questions) &&
      questions.length === 10 &&
      questions.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.options.every((option) => typeof option === "string") &&
          Number.isInteger(q.correctAnswer) &&
          q.correctAnswer >= 1 &&
          q.correctAnswer <= 4,
      );

    if (!isValid) {
      throw new Error("Quiz data is not in the correct format.");
    }

    return questions;
  } catch (error) {
    console.log(chalk.red("Failed to parse quiz questions from the AI."));
    console.log(chalk.red("Raw response:"));
    console.log(text);
    throw error;
  }
}

function askQuestion(questionObj, questionNumber) {
  console.log(chalk.blue(`\nQuestion ${questionNumber}/10`));
  console.log(chalk.yellow(questionObj.question));

  questionObj.options.forEach((option, index) => {
    console.log(`${index + 1}. ${option}`);
  });

  let userAnswer;

  while (true) {
    userAnswer = readlineSync.question("\nYour answer (1-4): ").trim();

    if (["1", "2", "3", "4"].includes(userAnswer)) {
      break;
    }

    console.log(chalk.red("Please type 1, 2, 3, or 4."));
  }

  return Number(userAnswer);
}

function checkAnswer(questionObj, userAnswer) {
  const correct = userAnswer === questionObj.correctAnswer;

  if (correct) {
    console.log(chalk.green("Correct! +1 point"));
    return 1;
  } else {
    const correctText = questionObj.options[questionObj.correctAnswer - 1];
    console.log(
      chalk.red(
        `Wrong! The correct answer was ${questionObj.correctAnswer}. ${correctText}`,
      ),
    );
    return 0;
  }
}

async function startQuiz() {
  console.log(chalk.cyan("Welcome to the AI Powered Quiz Game!"));
  console.log(chalk.cyan("Generating 10 quiz questions...\n"));

  let questions;

  try {
    questions = await generateQuizQuestions();
  } catch (error) {
    console.log(chalk.red("Could not start the quiz."));
    return;
  }

  let score = 0;

  for (let i = 0; i < questions.length; i++) {
    const userAnswer = askQuestion(questions[i], i + 1);
    score += checkAnswer(questions[i], userAnswer);
    console.log(chalk.magenta(`Current score: ${score}`));
  }

  console.log(chalk.cyan("\nQuiz finished!"));
  console.log(chalk.green(`Final score: ${score}/10`));
}

startQuiz();
