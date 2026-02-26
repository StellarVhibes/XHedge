"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Lightbulb, 
  Award,
  Clock,
  Users,
  ChevronRight,
  Play,
  CheckCircle,
  Lock
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  lessons: number;
  completed: boolean;
  locked: boolean;
  icon: React.ReactNode;
  progress?: number;
  topics: string[];
}

const modules: Module[] = [
  {
    id: "basics",
    title: "Volatility Basics",
    description: "Understanding market volatility and its impact on your investments",
    duration: "15 min",
    difficulty: "Beginner",
    lessons: 4,
    completed: true,
    locked: false,
    icon: <TrendingUp className="h-5 w-5" />,
    progress: 100,
    topics: ["What is Volatility", "Types of Volatility", "Measuring Volatility", "Market Indicators"]
  },
  {
    id: "hedging",
    title: "Hedging Strategies",
    description: "Learn how to protect your portfolio from market downturns",
    duration: "20 min",
    difficulty: "Intermediate",
    lessons: 5,
    completed: false,
    locked: false,
    icon: <Shield className="h-5 w-5" />,
    progress: 40,
    topics: ["Options Basics", "Put Options", "Call Options", "Spreads", "Advanced Strategies"]
  },
  {
    id: "defi",
    title: "DeFi Volatility",
    description: "Understanding volatility in decentralized finance protocols",
    duration: "25 min",
    difficulty: "Intermediate",
    lessons: 6,
    completed: false,
    locked: false,
    icon: <BarChart3 className="h-5 w-5" />,
    progress: 0,
    topics: ["DeFi Overview", "Liquidity Pools", "Yield Farming", "Impermanent Loss", "Smart Contracts", "Risk Management"]
  },
  {
    id: "advanced",
    title: "Advanced Strategies",
    description: "Sophisticated hedging techniques for experienced traders",
    duration: "30 min",
    difficulty: "Advanced",
    lessons: 7,
    completed: false,
    locked: true,
    icon: <Award className="h-5 w-5" />,
    progress: 0,
    topics: ["Greeks", "Volatility Surface", "Dynamic Hedging", "Portfolio Optimization", "Risk Metrics", "Algorithmic Trading", "Portfolio Construction"]
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Intermediate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "Advanced":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const totalProgress = Math.round(
  modules.reduce((acc, module) => acc + (module.progress || 0), 0) / modules.length
);

export default function LearnPage() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                XHedge Learning Hub
              </h1>
              <p className="mt-2 text-gray-600">
                Master volatility and hedging strategies with interactive educational content
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Overall Progress</p>
                <p className="text-2xl font-bold text-blue-600">{totalProgress}%</p>
              </div>
              <div className="w-32">
                <Progress value={totalProgress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Become a Volatility Expert
              </h2>
              <p className="text-blue-100 mb-6">
                Learn the fundamentals of market volatility, master hedging strategies, 
                and protect your investments in any market condition.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>2,500+ Learners</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>2 hours of content</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  <span>Certificate of completion</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Your Learning Journey</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span>Volatility Basics - Completed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-yellow-400 animate-pulse" />
                    <span>Hedging Strategies - In Progress</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-400" />
                    <span>DeFi Volatility - Not Started</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                    <span>Advanced Strategies - Locked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Learning Modules</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Sort by Duration
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Sort by Difficulty
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {modules.map((module) => (
              <Card 
                key={module.id} 
                className={`hover:shadow-lg transition-all duration-200 ${
                  module.locked ? "opacity-75" : "cursor-pointer"
                }`}
                onClick={() => !module.locked && setSelectedModule(module.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        module.completed ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                      }`}>
                        {module.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {module.description}
                        </CardDescription>
                      </div>
                    </div>
                    {module.locked && <Lock className="h-5 w-5 text-gray-400" />}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progress */}
                  {module.progress !== undefined && module.progress > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-2" />
                    </div>
                  )}

                  {/* Module Details */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {module.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {module.lessons} lessons
                      </div>
                    </div>
                    <Badge className={getDifficultyColor(module.difficulty)}>
                      {module.difficulty}
                    </Badge>
                  </div>

                  {/* Topics Preview */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Topics covered:</p>
                    <div className="flex flex-wrap gap-1">
                      {module.topics.slice(0, 3).map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {module.topics.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{module.topics.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {module.completed ? (
                      <Link href="/learn/volatility-basics">
                        <Button variant="outline" className="w-full">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Review Module
                        </Button>
                      </Link>
                    ) : module.locked ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Lock className="h-4 w-4 mr-2" />
                        Complete Previous Modules
                      </Button>
                    ) : module.progress && module.progress > 0 ? (
                      <Link href="/learn/volatility-basics">
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          Continue Learning
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/learn/volatility-basics">
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          Start Module
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <Lightbulb className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Tips</h3>
              <p className="text-blue-700 text-sm mb-4">
                Get bite-sized insights about volatility and hedging strategies
              </p>
              <Link href="/learn/tips">
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-300">
                  View Tips
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <BarChart3 className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Interactive Tools</h3>
              <p className="text-green-700 text-sm mb-4">
                Practice with our volatility calculator and hedging simulator
              </p>
              <Link href="/learn/tools">
                <Button variant="outline" size="sm" className="text-green-600 border-green-300">
                  Try Tools
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <Award className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Quiz Yourself</h3>
              <p className="text-purple-700 text-sm mb-4">
                Test your knowledge with interactive quizzes and challenges
              </p>
              <Link href="/learn/quiz/volatility-basics">
                <Button variant="outline" size="sm" className="text-purple-600 border-purple-300">
                  Take Quiz
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white rounded-xl p-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Master Volatility?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of learners who are already protecting their investments 
            with smart hedging strategies. Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-5 w-5 mr-2" />
              Start First Module
            </Button>
            <Button variant="outline" size="lg">
              <BookOpen className="h-5 w-5 mr-2" />
              Browse All Content
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
