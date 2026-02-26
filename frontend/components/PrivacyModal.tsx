"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Eye, Database, Lock, Globe, UserX, Calendar } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptCheckbox?: boolean;
  forceAccept?: boolean;
}

export default function PrivacyModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  showAcceptCheckbox = false,
  forceAccept = false 
}: PrivacyModalProps) {
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
      title="Privacy Policy"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your privacy is important to us. This Privacy Policy explains how we collect, 
            use, and protect your information when you use XHedge.
          </AlertDescription>
        </Alert>

        {/* Privacy Content */}
        <ScrollArea 
          className="h-96 w-full rounded-md border p-4"
          onScroll={handleScroll}
        >
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                1. Information We Collect
              </h3>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Wallet Information:</strong> We only access your public wallet address when you connect to our service.</p>
                <p><strong>Transaction Data:</strong> We process transaction data necessary for executing DeFi strategies.</p>
                <p><strong>Usage Analytics:</strong> We collect anonymous usage data to improve our service.</p>
                <p><strong>Browser Data:</strong> We may collect browser and device information for security purposes.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. How We Use Your Information</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>• To provide and maintain our DeFi services</p>
                <p>• To process transactions and execute smart contracts</p>
                <p>• To monitor and improve service performance</p>
                <p>• To detect and prevent fraud or security threats</p>
                <p>• To communicate with you about service updates</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Database className="h-5 w-5" />
                3. Data Storage and Security
              </h3>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Decentralized Storage:</strong> Your assets remain in smart contracts on the Stellar blockchain.</p>
                <p><strong>Off-chain Data:</strong> Personal information is stored securely with encryption.</p>
                <p><strong>Access Controls:</strong> We implement strict access controls and authentication.</p>
                <p><strong>Regular Audits:</strong> Our systems undergo regular security audits.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                4. Data Sharing and Disclosure
              </h3>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Public Blockchain:</strong> All transactions are publicly visible on the Stellar blockchain.</p>
                <p><strong>Service Providers:</strong> We may share data with trusted third-party service providers.</p>
                <p><strong>Legal Requirements:</strong> We may disclose information if required by law.</p>
                <p><strong>Business Transfers:</strong> Data may be transferred in business acquisition scenarios.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                5. International Data Transfers
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                XHedge operates globally and may transfer your data to countries other than your own. 
                We ensure appropriate safeguards are in place to protect your data in accordance with 
                applicable data protection laws.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Your Rights and Choices</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>• <strong>Access:</strong> You can request access to your personal information.</p>
                <p>• <strong>Correction:</strong> You can request correction of inaccurate information.</p>
                <p>• <strong>Deletion:</strong> You can request deletion of your personal information.</p>
                <p>• <strong>Portability:</strong> You can request a copy of your data.</p>
                <p>• <strong>Opt-out:</strong> You can disconnect your wallet at any time.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Cookies and Tracking</h3>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Essential Cookies:</strong> Required for basic site functionality.</p>
                <p><strong>Analytics Cookies:</strong> Help us understand how our site is used.</p>
                <p><strong>Preference Cookies:</strong> Remember your settings and preferences.</p>
                <p>You can control cookies through your browser settings.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <UserX className="h-5 w-5" />
                8. Children's Privacy
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Our service is not intended for children under 18. We do not knowingly collect 
                personal information from children under 18. If we become aware that we have 
                collected such information, we will delete it promptly.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Changes to This Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of 
                any changes by posting the new policy on this page and updating the 
                "Last updated" date. Your continued use of the service constitutes 
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Contact Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or your data rights, 
                please contact us at privacy@xhedge.com or through our official 
                Discord community.
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
                id="accept-privacy"
                checked={accepted}
                onCheckedChange={(checked: boolean) => setAccepted(checked)}
                disabled={!scrolledToBottom}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="accept-privacy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read and agree to the Privacy Policy
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
