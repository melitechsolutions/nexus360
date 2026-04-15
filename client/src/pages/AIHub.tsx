import { useState } from 'react';
import { useRequireFeature } from '@/lib/permissions';
import { Spinner } from '@/components/ui/spinner';
import { ModuleLayout } from '@/components/ModuleLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, AlertCircle } from 'lucide-react';
import { DocumentSummarizer } from '@/components/AI/DocumentSummarizer';
import { EmailGenerator } from '@/components/AI/EmailGenerator';
import { FinancialAnalyzer } from '@/components/AI/FinancialAnalyzer';
import { AIChatAssistant } from '@/components/AI/ChatAssistant';
import { trpc } from '@/lib/trpc';

export default function AIHub() {
  const [activeTab, setActiveTab] = useState('chat');
  const { allowed, isLoading } = useRequireFeature('ai:access');

  // Check if GPT-5 API is available
  const { data: aiStatus } = trpc.ai.checkAvailability.useQuery();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/' },
    { label: 'AI Hub' },
  ];

  return (
    <ModuleLayout
      title="AI Intelligence Hub"
      description="Powered by Groq AI - Automate document analysis, email generation, and financial insights"
      icon={<Sparkles className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6 max-w-7xl">
        {isLoading && <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>}
        {!isLoading && !allowed && null}
        {/* Status Alert */}
        {!aiStatus?.available && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>AI Features Not Configured</AlertTitle>
            <AlertDescription>
              Configure ANTHROPIC_API_KEY environment variable to unlock AI-powered features like document summarization, email generation, and financial analysis. See ENVIRONMENT_SETUP_GUIDE.md for setup details.
            </AlertDescription>
          </Alert>
        )}

        {aiStatus?.available && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Groq AI Ready</AlertTitle>
            <AlertDescription>
              All AI features are enabled. Model: {aiStatus.model}. Features: {aiStatus.features?.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Feature Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Document Summarizer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Extract key points, action items, and financial summaries from documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Email Generator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Create professional emails in multiple tones for invoices, proposals, and follow-ups
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Financial Analyzer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Analyze revenue, expenses, cash flow, and profitability with AI insights
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Chat Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                Ask questions, get insights, and query CRM data conversationally
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for AI Features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="summarize">Summarize</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <AIChatAssistant />
          </TabsContent>

          {/* Summarize Tab */}
          <TabsContent value="summarize" className="space-y-4">
            <DocumentSummarizer />
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4">
            <EmailGenerator />
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <FinancialAnalyzer />
          </TabsContent>
        </Tabs>

        {/* Usage Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <strong>Documents:</strong> Use clear, well-structured text (50+ characters)
              </li>
              <li>
                <strong>Emails:</strong> Provide specific context about recipients, amounts, and dates
              </li>
              <li>
                <strong>Financial:</strong> Include numbers with context (e.g., "January revenue: 50,000 KES")
              </li>
              <li>
                <strong>Chat:</strong> Be specific with questions and use context sidebar for better answers
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
