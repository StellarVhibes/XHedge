"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw,
  Award,
  Brain,
  Target,
  Lightbulb
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface QuizResult {
  score: number;
  total: number;
  correct: number;
  timeSpent: number;
  category: string;
}

const questions: Question[] = [
  {
    id: "q1",
    question: "What is volatility in financial markets?",
    options: [
      "The rate at which prices increase over time",
      "A measure of price fluctuations and dispersion of returns",
      "The total market capitalization of an asset",
      "The dividend yield of a stock"
    ],
    correctAnswer: 1,
    explanation: "Volatility measures how much the price of an asset fluctuates over time. It's a statistical measure of the dispersion of returns.",
    difficulty: "Easy"
  },
  {
    id: "q2",
    question: "Which of the following is NOT a type of volatility?",
    options: [
      "Historical volatility",
      "Implied volatility",
      "Future volatility",
      "Realized volatility"
    ],
    correctAnswer: 2,
    explanation: "Future volatility is not a standard type. The main types are historical (realized) volatility and implied volatility.",
    difficulty: "Easy"
  },
  {
    id: "q3",
    question: "What does a VIX value of 30 typically indicate?",
    options: [
      "Low market volatility and investor confidence",
      "Normal market conditions",
      "High market volatility and fear",
      "Market is closed"
    ],
    correctAnswer: 2,
    explanation: "A VIX above 30 typically indicates high market volatility and increased investor fear. The VIX often spikes during market turmoil.",
    difficulty: "Medium"
  },
  {
    id: "q4",
    question: "If a stock has a beta of 1.5, what does this mean?",
    options: [
      "It's 50% less volatile than the market",
      "It's 50% more volatile than the market",
      "It moves in the opposite direction of the market",
      "It has no correlation with the market"
    ],
    correctAnswer: 1,
    explanation: "A beta of 1.5 means the stock is 50% more volatile than the market. When the market moves up or down, this stock typically moves 1.5 times as much.",
    difficulty: "Medium"
  },
  {
    id: "q5",
    question: "What is the primary purpose of hedging?",
    options: [
      "To maximize returns",
      "To reduce investment risk",
      "To avoid paying taxes",
      "To increase portfolio diversification"
    ],
    correctAnswer: 1,
    explanation: "The primary purpose of hedging is to reduce or eliminate investment risk by taking offsetting positions in related assets.",
    difficulty: "Easy"
  },
  {
    id: "q6",
    question: "Which instrument is commonly used for volatility hedging?",
    options: [
      "Common stocks",
      "Government bonds",
      "Put options",
      "Savings accounts"
    ],
    correctAnswer: 2,
    explanation: "Put options are commonly used for hedging as they provide the right to sell an asset at a predetermined price, protecting against price declines.",
    difficulty: "Medium"
  },
  {
    id: "q7",
    question: "What is implied volatility?",
    options: [
      "Volatility calculated from historical price data",
      "Market's expectation of future volatility derived from options prices",
      "The actual volatility that occurred in the past",
      "The volatility predicted by mathematical models"
    ],
    correctAnswer: 1,
    explanation: "Implied volatility is the market's expectation of future volatility, derived from the prices of options contracts.",
    difficulty: "Hard"
  },
  {
    id: "q8",
    question: "How is annualized volatility typically calculated from daily volatility?",
    options: [
      "Multiply by 365",
      "Multiply by the square root of 252",
      "Multiply by 12",
      "Divide by the square root of 365"
    ],
    correctAnswer: 1,
    explanation: "To annualize daily volatility, you multiply by the square root of 252 (the approximate number of trading days in a year).",
    difficulty: "Hard"
  },
  {
    id: "q9",
    question: "What is a protective collar strategy?",
    options: [
      "Buying only call options",
      "Selling only put options",
      "Buying put options while selling call options",
      "Holding only cash"
    ],
    correctAnswer: 2,
    explanation: "A protective collar involves buying put options for downside protection while simultaneously selling call options to finance the puts.",
    difficulty: "Hard"
  },
  {
    id: "q10",
    question: "What is the main disadvantage of hedging?",
    options: [
      "It always loses money",
      "It reduces potential upside and costs money",
      "It's illegal in most markets",
      "It requires constant monitoring"
    ],
    correctAnswer: 1,
    explanation: "The main disadvantage of hedging is that it reduces potential upside gains and involves costs that can impact overall returns.",
    difficulty: "Medium"
  }
];

export default function QuizPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [startTime] = useState(Date.now());
  const [showExplanation, setShowExplanation] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    setShowExplanation(true);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(answers[currentQuestion + 1] ?? null);
      setShowResult(false);
      setShowExplanation(false);
    } else {
      completeQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1] ?? null);
      setShowResult(false);
      setShowExplanation(false);
    }
  };

  const completeQuiz = () => {
    const correctAnswers = answers.filter((answer, index) => answer === questions[index].correctAnswer).length;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    
    setQuizCompleted(true);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers([]);
    setQuizCompleted(false);
    setShowExplanation(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Outstanding! You're a volatility expert!";
    if (score >= 80) return "Excellent! You have strong knowledge.";
    if (score >= 70) return "Good job! You understand the basics well.";
    if (score >= 60) return "Not bad! Consider reviewing some concepts.";
    return "Keep learning! Review the materials and try again.";
  };

  if (quizCompleted) {
    const correctAnswers = answers.filter((answer, index) => answer === questions[index].correctAnswer).length;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <Link href="/learn">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Learning Hub
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Complete!</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-10 w-10 text-blue-600" />
              </div>
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(score)}`}>
                {score}%
              </div>
              <p className="text-lg text-gray-600 mb-2">{getScoreMessage(score)}</p>
              <p className="text-sm text-gray-500">
                You got {correctAnswers} out of {questions.length} questions correct
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{correctAnswers}/{questions.length}</div>
                  <p className="text-sm text-gray-500">Correct Answers</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{Math.round(timeSpent / 60)}m {timeSpent % 60}s</div>
                  <p className="text-sm text-gray-500">Time Spent</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Lightbulb className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{score >= 70 ? "Passed" : "Review"}</div>
                  <p className="text-sm text-gray-500">Result</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={resetQuiz} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
              <Link href="/learn">
                <Button>
                  Continue Learning
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Review Answers */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review Your Answers</h2>
            <div className="space-y-4">
              {questions.map((q, index) => {
                const userAnswer = answers[index];
                const isCorrect = userAnswer === q.correctAnswer;
                
                return (
                  <div key={q.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">Question {index + 1}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getDifficultyColor(q.difficulty)}>
                          {q.difficulty}
                        </Badge>
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded border ${
                            optIndex === q.correctAnswer
                              ? "bg-green-50 border-green-200"
                              : optIndex === userAnswer && !isCorrect
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {optIndex === q.correctAnswer && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {optIndex === userAnswer && !isCorrect && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">{option}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!isCorrect && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/learn">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Learning Hub
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Volatility Basics Quiz</h1>
                <p className="text-sm text-gray-500">Test your knowledge</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {currentQuestion + 1} / {questions.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Progress</span>
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border">
          {/* Question Header */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Question {currentQuestion + 1}</h2>
              <Badge className={getDifficultyColor(question.difficulty)}>
                {question.difficulty}
              </Badge>
            </div>
            <p className="text-lg text-gray-800">{question.question}</p>
          </div>

          {/* Answer Options */}
          <div className="p-6">
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = showResult && index === question.correctAnswer;
                const isWrong = showResult && isSelected && index !== question.correctAnswer;
                
                return (
                  <div
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isCorrect
                        ? "bg-green-50 border-green-200"
                        : isWrong
                        ? "bg-red-50 border-red-200"
                        : isSelected
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    } ${showResult ? "cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-gray-800">{option}</span>
                      {isCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                      )}
                      {isWrong && (
                        <XCircle className="h-5 w-5 text-red-500 ml-auto" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Explanation</h4>
                <p className="text-blue-800">{question.explanation}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="border-t p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {!showResult ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentQuestion === questions.length - 1 ? "Complete Quiz" : "Next"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
