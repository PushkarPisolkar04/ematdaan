import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  RefreshCw,
  Copy,
  Download
} from 'lucide-react';
import { createAntiCoercionReceipt, canChangeVote } from '@/lib/advancedSecurity';
import { useToast } from '@/hooks/use-toast';

interface VoteReceiptData {
  receipt_id: string;
  election_id: string;
  voter_id: string;
  timestamp: string;
  can_change_until: string;
  change_count: number;
  max_changes: number;
  candidate_name?: string;
  election_name?: string;
}

interface VoteReceiptCardProps {
  receipt: VoteReceiptData;
  onChangeVote?: () => void;
  onVerifyVote?: () => void;
}

const VoteReceiptCard: React.FC<VoteReceiptCardProps> = ({
  receipt,
  onChangeVote,
  onVerifyVote
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [canChange, setCanChange] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const changeDeadline = new Date(receipt.can_change_until).getTime();
      const remaining = Math.max(0, changeDeadline - now);
      
      setTimeLeft(remaining);
      setCanChange(remaining > 0 && receipt.change_count < receipt.max_changes);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [receipt]);

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const copyReceiptId = () => {
    navigator.clipboard.writeText(receipt.receipt_id);
    toast({
      title: "Receipt ID Copied",
      description: "You can use this ID to verify your vote later",
    });
  };

  const downloadReceipt = () => {
    const receiptData = {
      receipt_id: receipt.receipt_id,
      election_name: receipt.election_name,
      candidate_name: receipt.candidate_name,
      timestamp: receipt.timestamp,
      verification_url: `${window.location.origin}/verify/${receipt.receipt_id}`
    };

    const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vote-receipt-${receipt.receipt_id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Receipt Downloaded",
      description: "Keep this file safe for vote verification",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
          <Receipt className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-green-800">Vote Receipt</CardTitle>
        <CardDescription>
          Your vote has been securely recorded and encrypted
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Receipt ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Receipt ID</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 p-2 rounded text-sm font-mono">
              {receipt.receipt_id}
            </code>
            <Button size="sm" variant="outline" onClick={copyReceiptId}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Election & Candidate Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Election</label>
            <p className="text-sm text-gray-900">{receipt.election_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Candidate</label>
            <p className="text-sm text-gray-900">{receipt.candidate_name || 'N/A'}</p>
          </div>
        </div>

        {/* Timestamp */}
        <div>
          <label className="text-sm font-medium text-gray-700">Vote Cast At</label>
          <p className="text-sm text-gray-900">
            {new Date(receipt.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Anti-Coercion Status */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Anti-Coercion Protection</label>
            <Badge variant={canChange ? "default" : "secondary"}>
              {canChange ? "Active" : "Expired"}
            </Badge>
          </div>
          
          {timeLeft > 0 ? (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="h-4 w-4" />
              <span>Can change vote for: {formatTimeRemaining(timeLeft)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4" />
              <span>Vote is now final and immutable</span>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-1">
            Changes used: {receipt.change_count}/{receipt.max_changes}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {canChange && onChangeVote && (
            <Button 
              onClick={onChangeVote}
              variant="outline"
              className="flex-1"
              disabled={!canChange}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Change Vote
            </Button>
          )}
          
          {onVerifyVote && (
            <Button 
              onClick={onVerifyVote}
              variant="outline"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Verify Vote
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={downloadReceipt}
            variant="ghost"
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Security Features:</p>
              <ul className="space-y-1">
                <li>• Vote encrypted with AES-256</li>
                <li>• Digital signature verification</li>
                <li>• Merkle tree inclusion proof</li>
                <li>• Anti-coercion protection window</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoteReceiptCard; 