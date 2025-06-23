import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Search, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { verifyVote } from "@/lib/api/voting";

// Add a type for the verification result
interface VerificationResult {
  status: 'valid' | 'invalid';
  votedFor?: string;
  timestamp?: string;
  electionId?: string;
  merkleRoot?: string;
  merkleProof?: {
    root: string;
    proof: string[];
    leaf: string;
    index: number;
  };
}

const VerifyVote = () => {
  const [receiptHash, setReceiptHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // If navigated from dashboard with receipt, auto-fill
    if (location.state?.receipt) {
      setReceiptHash(location.state.receipt);
    }
  }, [location]);

  const handleVerifyVote = async () => {
    if (!receiptHash.trim()) {
      toast({
        title: "Missing Receipt",
        description: "Please enter your vote receipt hash",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const result: any = await verifyVote(receiptHash.trim());
      if (result.status === 'valid') {
        setVerificationResult({
          status: 'valid',
          votedFor: result.votedFor,
          timestamp: result.timestamp,
          electionId: result.electionId,
          merkleRoot: result.merkleRoot,
          merkleProof: result.merkleProof,
        });
        toast({
          title: "✅ Vote Verified",
          description: "Your vote is included in the Merkle Tree",
        });
      } else {
        setVerificationResult({ status: 'invalid' });
        toast({
          title: "❌ Verification Failed",
          description: "Vote not found or invalid receipt hash",
          variant: "destructive"
        });
      }
    } catch (error) {
      setVerificationResult({ status: 'invalid' });
      toast({
        title: "❌ Verification Failed",
        description: error instanceof Error ? error.message : "Vote not found or invalid receipt hash",
        variant: "destructive"
      });
    }
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Vote Verification
          </h1>
          <p className="text-xl text-muted-foreground">
            Verify that your vote was counted correctly using Merkle tree verification
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6" />
              Enter Vote Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">Vote Receipt Hash</Label>
              <Input
                id="receipt"
                placeholder="Enter your vote receipt hash (e.g., vote_1234567890_abcdef)"
                value={receiptHash}
                onChange={(e) => setReceiptHash(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                This is the unique hash you received after casting your vote
              </p>
            </div>
            
            <Button 
              onClick={handleVerifyVote} 
              disabled={isVerifying}
              className="w-full bg-saffron hover:bg-saffron/90"
            >
              {isVerifying ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Vote...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify Vote
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {verificationResult && (
          <Card className={`border-2 ${
            verificationResult.status === 'valid' 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${
                verificationResult.status === 'valid' ? 'text-green-800' : 'text-red-800'
              }`}>
                {verificationResult.status === 'valid' ? (
                  <>
                    <CheckCircle className="h-6 w-6" />
                    ✅ Vote Verified Successfully
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6" />
                    ❌ Vote Not Found
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationResult.status === 'valid' ? (
                <div className="space-y-6">
                  <div className={`p-4 rounded-lg bg-green-100 border border-green-200`}>
                    <p className="text-green-800 font-medium">
                      Your vote is included in the Merkle Tree and has been counted correctly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Vote Details</h3>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm font-medium">Voted For</Label>
                          <div className="bg-background p-3 rounded border">
                            {verificationResult.votedFor || 'Encrypted (private)'}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Timestamp</Label>
                          <div className="bg-background p-3 rounded border font-mono text-sm">
                            {verificationResult.timestamp ? new Date(verificationResult.timestamp).toLocaleString() : ''}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Election ID</Label>
                          <div className="bg-background p-3 rounded border font-mono text-sm">
                            {verificationResult.electionId || ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Vote Verification Proof</h3>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm font-medium">Merkle Root</Label>
                          <div className="bg-background p-3 rounded border font-mono text-xs break-all">
                            {verificationResult.merkleRoot}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Merkle Proof Path</Label>
                          <div className="bg-background p-3 rounded border space-y-1">
                            {verificationResult.merkleProof && Array.isArray(verificationResult.merkleProof.proof) ? verificationResult.merkleProof.proof.map((proof, index) => (
                              <div key={index} className="font-mono text-xs break-all">
                                {index + 1}. {proof}
                              </div>
                            )) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Vote Verification Status</h4>
                    <p className="text-blue-700 text-sm">
                      The Merkle root hash matches the expected value, confirming that your vote 
                      has been correctly recorded in the database.
                    </p>
                  </div>
                </div>
              ) :
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-100 border border-red-200">
                    <p className="text-red-800 font-medium">
                      The provided receipt hash was not found in our records.
                    </p>
                  </div>
                  
                  <div className="text-sm text-red-700">
                    <h4 className="font-semibold mb-2">Possible reasons:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Incorrect receipt hash entered</li>
                      <li>Vote has not been processed yet</li>
                      <li>Receipt hash has been corrupted</li>
                      <li>Vote was submitted but failed validation</li>
                    </ul>
                  </div>
                </div>
              }
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Where to find your receipt?</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Check your voter dashboard</li>
                  <li>• Look for the confirmation email</li>
                  <li>• Screenshot taken after voting</li>
                  <li>• Saved browser notification</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Still having issues?</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Contact support team</li>
                  <li>• Provide your MetaMask address</li>
                  <li>• Include timestamp of your vote</li>
                  <li>• Available 24/7 during voting period</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyVote;
