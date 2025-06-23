import { useState, useEffect } from "react";
import { FileText, Download, QrCode, AlertCircle, Clipboard, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { generateVoteReceipt } from '@/lib/receipt';

const VoteReceipt = () => {
  const { receiptId } = useParams();
  const [receipt, setReceipt] = useState<any>(null);
  const [allReceipts, setAllReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [voterName, setVoterName] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (receiptId) {
          // Single receipt view (existing logic)
          const { data, error } = await supabase
            .from('votes')
            .select(`
              *,
              elections (
                name,
                start_time,
                end_time
              ),
              candidates (
                name,
                party,
                symbol
              )
            `)
            .eq('id', receiptId)
            .single();
          if (error) throw error;
          if (!data) throw new Error("Receipt not found");
          setReceipt(data);
          // Fetch voter name from users table
          if (data.voter_did) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('name')
              .eq('did', data.voter_did)
              .single();
            if (!userError && userData && userData.name) {
              setVoterName(userData.name);
            } else {
              setVoterName('Voter');
            }
          }
        } else {
          // List all receipts for the current user
          const userDID = localStorage.getItem('userDID');
          if (!userDID) {
            setError('User not authenticated');
            setLoading(false);
            return;
          }
          const { data: votes, error: votesError } = await supabase
            .from('votes')
            .select(`
              id,
              timestamp,
              elections (name, start_time, end_time),
              candidates (name, party, symbol)
            `)
            .eq('voter_did', userDID)
            .order('timestamp', { ascending: false });
          if (votesError) throw votesError;
          setAllReceipts(votes || []);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load vote receipt(s)");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [receiptId]);

  const handleDownload = async () => {
    if (!receipt) return;

    try {
      await generateVoteReceipt({
        voteId: receipt.id,
        voterName: voterName || 'Voter',
        voterDID: (() => {
          try {
            const didObj = typeof receipt.voter_did === 'string' ? JSON.parse(receipt.voter_did) : receipt.voter_did;
            return didObj?.id || receipt.voter_did;
          } catch {
            return receipt.voter_did;
          }
        })(),
        candidateName: receipt.candidates?.name || 'Unknown',
        candidateParty: receipt.candidates?.party || 'Unknown',
        candidateSymbol: receipt.candidates?.symbol || '',
        timestamp: new Date(receipt.timestamp),
        merkleProof: receipt.merkle_proof
      });

      toast({
        title: "Success",
        description: "Vote receipt downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B21E8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!receiptId) {
    // Show all receipts for the user
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Your Vote Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium mb-1 text-red-600">{error}</p>
                </div>
              ) : allReceipts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium mb-1">No Vote Receipts Found</p>
                  <p className="text-xs text-muted-foreground">
                    You haven't voted in any elections yet. When you cast a vote, your receipts will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allReceipts.map((vote) => (
                    <div key={vote.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{vote.elections?.name || 'Election'}</div>
                        <div className="text-xs text-muted-foreground">
                          Voted on {new Date(vote.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Candidate: {vote.candidates?.name || 'Unknown'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/vote-receipt/${vote.id}`)}
                        className="hover:bg-[#6B21E8] hover:text-white"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Receipt
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                Receipt Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-800 font-medium">
                  {error || "The requested vote receipt could not be found."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <h4 className="font-semibold mb-2">This might happen because:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>The receipt ID is incorrect or has been modified</li>
                    <li>You haven't voted in this election yet</li>
                    <li>The vote is still being processed</li>
                    <li>The election has been archived</li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Vote Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-1">Vote Receipt Hash</h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs break-all bg-muted p-2 rounded select-all">{receipt.id}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(receipt.id);
                    toast({ title: "Copied!", description: "Vote Receipt Hash copied to clipboard." });
                  }}
                  aria-label="Copy Vote Receipt Hash"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use this hash to verify your vote on the verification page.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Election</h3>
                <p className="text-lg">{receipt.elections.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Date Cast</h3>
                <p className="text-lg">{new Date(receipt.timestamp).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Candidate</h3>
                <p className="text-lg">{receipt.candidates?.name || "Unknown"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Party</h3>
                <p className="text-lg">{receipt.candidates?.party || "Unknown"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Vote Verification</h3>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs font-mono break-all">{receipt.merkle_proof.root}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownload} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/verify-vote/${receipt.id}`)}
                className="flex-1"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Verify Vote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoteReceipt; 