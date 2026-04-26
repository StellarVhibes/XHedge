"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calculator, 
  Shield, 
  BarChart3,
  TrendingUp,
  Play,
  BookOpen
} from "lucide-react";
import VolatilityCalculator from "@/components/VolatilityCalculator";
import HedgingSimulator from "@/components/HedgingSimulator";

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Learning Hub
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-green-600" />
                Interactive Tools
              </h1>
              <p className="mt-2 text-gray-600">
                Practice volatility calculations and hedging strategies with our interactive simulators
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tools Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-600" />
                Volatility Calculator
              </CardTitle>
              <CardDescription>
                Calculate historical volatility from price data and understand market movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Real-time calculations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Annualized volatility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Risk assessment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Educational insights</span>
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">What you'll learn:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• How to calculate standard deviation</li>
                    <li>• Understanding volatility levels</li>
                    <li>• Interpreting market signals</li>
                    <li>• Risk assessment techniques</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-600" />
                Hedging Simulator
              </CardTitle>
              <CardDescription>
                Simulate hedging strategies and see how they protect your portfolio from market downturns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Portfolio protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Cost analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Risk scenarios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Strategy comparison</span>
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">What you'll learn:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• How hedging reduces risk</li>
                    <li>• Cost-benefit analysis</li>
                    <li>• Different hedge strategies</li>
                    <li>• Portfolio protection levels</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Tools */}
        <div className="space-y-12">
          {/* Volatility Calculator */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Calculator className="h-6 w-6 text-blue-600" />
                  Volatility Calculator
                </h2>
                <p className="text-gray-600 mt-1">
                  Input price data to calculate historical volatility and understand market behavior
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                Interactive Tool
              </Badge>
            </div>
            <VolatilityCalculator />
          </section>

          {/* Hedging Simulator */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Shield className="h-6 w-6 text-green-600" />
                  Hedging Simulator
                </h2>
                <p className="text-gray-600 mt-1">
                  Simulate different hedging strategies and see how they protect against market losses
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                Interactive Tool
              </Badge>
            </div>
            <HedgingSimulator />
          </section>
        </div>

        {/* Learning Path */}
        <div className="mt-16 bg-white rounded-xl shadow-sm border p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Continue Your Learning Journey</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Now that you've practiced with our tools, deepen your understanding with our comprehensive modules
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Volatility Basics</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Master the fundamentals of market volatility
                </p>
                <Link href="/learn/volatility-basics">
                  <Button variant="outline" size="sm" className="w-full">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Start Learning
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Hedging Strategies</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Learn advanced techniques to protect your portfolio
                </p>
                <Link href="/learn/hedging">
                  <Button variant="outline" size="sm" className="w-full">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Explore Strategies
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Test Your Knowledge</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Take quizzes to reinforce your learning
                </p>
                <Link href="/learn/quiz/volatility-basics">
                  <Button variant="outline" size="sm" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Take Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
