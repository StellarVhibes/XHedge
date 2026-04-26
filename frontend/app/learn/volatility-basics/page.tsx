"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Lightbulb,
  CheckCircle,
  Target
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  content: React.ReactNode;
  interactive?: boolean;
  completed: boolean;
}

const lessons: Lesson[] = [
  {
    id: "what-is-volatility",
    title: "What is Volatility?",
    completed: true,
    content: (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Definition</h3>
          <p className="text-blue-800">
            Volatility is a statistical measure of the dispersion of returns for a given security or market index. 
            In simpler terms, it measures how much the price of an asset fluctuates over time.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Key Concepts:</h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>High Volatility:</strong> Large price swings, higher risk, potentially higher returns
              </div>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Low Volatility:</strong> Small price movements, lower risk, more predictable returns
              </div>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Historical Volatility:</strong> Based on past price movements
              </div>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Implied Volatility:</strong> Market's expectation of future volatility
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">💡 Real-World Example</h4>
          <p className="text-gray-700">
            During the 2020 market crash, the VIX (volatility index) spiked to over 80, indicating 
            extremely high market volatility. In contrast, during stable periods, the VIX typically hovers around 10-20.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "types-of-volatility",
    title: "Types of Volatility",
    completed: true,
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Historical Volatility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Calculated from past price data over a specific period
              </p>
              <ul className="text-sm space-y-1">
                <li>• Uses actual price movements</li>
                <li>• Look-back period (30, 60, 90 days)</li>
                <li>• Standard deviation of returns</li>
                <li>• Objective measure</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Implied Volatility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Derived from options prices, reflects market expectations
              </p>
              <ul className="text-sm space-y-1">
                <li>• Forward-looking measure</li>
                <li>• Based on options pricing</li>
                <li>• Market sentiment indicator</li>
                <li>• Can predict future movements</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Note</h4>
          <p className="text-yellow-800">
            Historical and implied volatility can diverge significantly during market stress. 
            Implied volatility often spikes before major events, while historical volatility 
            reflects what has already happened.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "measuring-volatility",
    title: "Measuring Volatility",
    completed: false,
    interactive: true,
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Common Volatility Metrics</h4>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Standard Deviation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                The most common measure of volatility
              </p>
              <div className="bg-gray-100 rounded p-3 font-mono text-sm">
                σ = √(Σ(xi - μ)² / n)
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Where σ = standard deviation, xi = each value, μ = mean, n = number of values
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beta (β)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Measures volatility relative to the market
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>β = 1.0</span>
                  <Badge variant="secondary">Same as market</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>β &gt; 1.0</span>
                  <Badge className="bg-red-100 text-red-800">More volatile</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>β &lt; 1.0</span>
                  <Badge className="bg-green-100 text-green-800">Less volatile</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">VIX Index</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                The "fear index" - measures expected S&P 500 volatility
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Below 20:</span>
                  <span className="text-green-600">Low volatility</span>
                </div>
                <div className="flex justify-between">
                  <span>20-30:</span>
                  <span className="text-yellow-600">Normal volatility</span>
                </div>
                <div className="flex justify-between">
                  <span>Above 30:</span>
                  <span className="text-red-600">High volatility</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Calculator */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-4">🧮 Interactive Volatility Calculator</h4>
          <p className="text-blue-800 mb-4">
            Try our volatility calculator to see how different assets behave!
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Open Calculator
          </Button>
        </div>
      </div>
    )
  },
  {
    id: "market-indicators",
    title: "Market Indicators",
    completed: false,
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                VIX (CBOE Volatility Index)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Often called the "fear gauge"
              </p>
              <ul className="text-sm space-y-1">
                <li>• Measures 30-day expected volatility</li>
                <li>• Based on S&P 500 options</li>
                <li>• Inversely correlated with market</li>
                <li>• Spikes during market crashes</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                ATR (Average True Range)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Measures price range volatility
              </p>
              <ul className="text-sm space-y-1">
                <li>• Captures gaps and limit moves</li>
                <li>• Useful for stop-loss placement</li>
                <li>• Works for any time frame</li>
                <li>• Trend-independent measure</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2">📊 Reading Market Signals</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>High VIX + Market Down:</strong> Fear and panic selling
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Low VIX + Market Up:</strong> Complacency and confidence
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Rising VIX + Stable Market:</strong> Uncertainty ahead
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

export default function VolatilityBasicsPage() {
  const router = useRouter();
  const [currentLesson, setCurrentLesson] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const lesson = lessons[currentLesson];
  const progress = ((currentLesson + 1) / lessons.length) * 100;

  const handleNext = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    }
  };

  const handlePrevious = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    }
  };

  const handleComplete = () => {
    // Mark lesson as completed
    const updatedLessons = [...lessons];
    updatedLessons[currentLesson].completed = true;
    
    // Navigate to quiz or next module
    router.push('/learn/quiz/volatility-basics');
  };

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
                <h1 className="text-xl font-bold text-gray-900">Volatility Basics</h1>
                <p className="text-sm text-gray-500">Module 1 of 4</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {currentLesson + 1} / {lessons.length}
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

      {/* Lesson Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border">
          {/* Lesson Header */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{lesson.title}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">Lesson {currentLesson + 1}</span>
                  {lesson.completed && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {lesson.interactive && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Interactive
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Lesson Body */}
          <div className="p-6">
            {lesson.content}
          </div>

          {/* Navigation */}
          <div className="border-t p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentLesson === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {lessons.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentLesson
                        ? "bg-blue-600"
                        : lessons[index].completed
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              {currentLesson === lessons.length - 1 ? (
                <Button onClick={handleComplete}>
                  Complete Module
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {lessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              className={`cursor-pointer transition-all ${
                index === currentLesson
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "hover:shadow-md"
              }`}
              onClick={() => setCurrentLesson(index)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Lesson {index + 1}</span>
                  {lesson.completed && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{lesson.title}</h3>
                {lesson.interactive && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    Interactive
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
