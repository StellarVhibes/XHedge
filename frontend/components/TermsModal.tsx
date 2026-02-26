"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Shield, AlertTriangle, FileText } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptCheckbox?: boolean;
  forceAccept?: boolean;
}

export default function TermsModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  showAcceptCheckbox = false,
  forceAccept = false 
}: TermsModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    setScrolledToBottom(isAtBottom);
  };

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  const canAccept = !showAcceptCheckbox || (accepted && scrolledToBottom);

  const lastUpdated = "February 26, 2024";

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Terms of Service"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Notice */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Please read these Terms of Service carefully before using XHedge. 
            By using our service, you agree to these terms.
          </AlertDescription>
        </Alert>

        {/* Terms Content */}
        <ScrollArea 
          className="h-96 w-full rounded-md border p-4"
          onScroll={handleScroll}
        >
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                1. Acceptance of Terms
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using XHedge ("the Service"), you acknowledge that you have read, 
                understood, and agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Description of Service</h3>
              <p className="text-muted-foreground leading-relaxed">
                XHedge is a decentralized finance (DeFi) platform built on the Stellar network 
                that provides automated volatility protection and yield farming strategies. The Service 
                allows users to deposit digital assets and participate in various DeFi strategies 
                through smart contracts.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. User Responsibilities</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>• You are solely responsible for maintaining the security of your wallet and private keys.</p>
                <p>• You must comply with all applicable laws and regulations when using the Service.</p>
                <p>• You are responsible for all taxes and reporting related to your use of the Service.</p>
                <p>• You must not attempt to exploit vulnerabilities or engage in malicious activities.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                4. Risks and Disclaimers
              </h3>
              <div className="space-y-2 text-muted-foreground">
                <p>• <strong>Smart Contract Risk:</strong> Smart contracts may contain vulnerabilities or bugs.</p>
                <p>• <strong>Market Risk:</strong> Digital asset prices are highly volatile and can result in significant losses.</p>
                <p>• <strong>Technical Risk:</strong> Network congestion, outages, or technical failures may occur.</p>
                <p>• <strong>Regulatory Risk:</strong> Regulatory changes may affect the Service's operation.</p>
                <p>• <strong>Impermanent Loss:</strong> Liquidity provision may result in impermanent loss.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed">
                XHedge is provided "as is" without warranties of any kind. In no event shall 
                XHedge, its developers, or affiliates be liable for any indirect, incidental, 
                special, or consequential damages arising out of or in connection with your use of the Service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Intellectual Property</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by XHedge 
                and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your access to the Service immediately, without prior notice 
                or liability, for any reason, including if you breach the Terms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Changes to Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. Changes will be effective 
                immediately upon posting. Your continued use of the Service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Governing Law</h3>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the 
                jurisdiction in which XHedge operates, without regard to conflict of law provisions.
              </p>
            </section>

            {/* Last Updated */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Accept Section */}
        {showAcceptCheckbox && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                onCheckedChange={(checked: boolean) => setAccepted(checked)}
                disabled={!scrolledToBottom}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="accept-terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read and agree to the Terms of Service
                </label>
                {!scrolledToBottom && (
                  <p className="text-xs text-muted-foreground">
                    Please scroll to the bottom before accepting
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Decline
              </Button>
              <Button 
                onClick={handleAccept} 
                disabled={!canAccept}
                className="min-w-24"
              >
                {forceAccept ? "Continue" : "Accept"}
              </Button>
            </div>
          </div>
        )}

        {/* Simple Close Button */}
        {!showAcceptCheckbox && (
          <div className="flex justify-end">
            <Button onClick={onClose}>
              I Understand
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
