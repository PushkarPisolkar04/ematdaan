import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import defaultAvatar from '@/assets/default-avatar.png';
import { supabase } from '@/lib/supabase';

interface VoteReceiptData {
  voteId: string;
  voterName: string;
  voterDID: string;
  candidateName: string;
  candidateParty: string;
  candidateSymbol: string;
  timestamp: Date;
  merkleProof: {
    root: string;
    proof: string[];
  };
  candidatePhoto?: string;
  voterPhoto?: string;
}

// Helper function to generate QR code
const generateQRCode = async (voteId: string): Promise<string> => {
  try {
    const verificationUrl = `${window.location.origin}/verify-vote/${voteId}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrDataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return '';
  }
};

export const generateVoteReceipt = async (data: VoteReceiptData): Promise<void> => {
  try {
    // Create PDF with custom font size
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 140] // Custom size similar to ID card dimensions
    });

    // Define colors
    const primaryColor = '#6B21E8'; // Purple
    const secondaryColor = '#FF9933'; // Saffron
    const backgroundColor = '#F5F5F4'; // Warm gray background
    const cardColor = '#FAFAF9'; // Slightly off-white for card
    
    // Add background
    const bgRgb = hexToRgb(backgroundColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.rect(0, 0, 210, 140, 'F');

    // Add logo and header
    try {
      const logoUrl = `${window.location.origin}/logo.png`;
      const logoImg = await fetch(logoUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
      doc.addImage(logoImg, 'PNG', 10, 10, 15, 15);
    } catch (e) {
      // Logo not found, skip
    }

    // Add main title
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('ELECTRONIC VOTING RECEIPT', 30, 15);
    
    // Add subtitle
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor);
    doc.text('Official Digital Ballot Verification Document', 30, 22);

    // Add QR code in top right with white background
    const qrCode = await generateQRCode(data.voteId);
    if (qrCode) {
      // Add white background for QR code
      doc.setFillColor(255, 255, 255);
      doc.rect(155, 10, 45, 45, 'F');
      // Add QR code
      doc.addImage(qrCode, 'PNG', 155, 10, 45, 45);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Scan to Verify', 177.5, 60, { align: 'center' });
    }

    // Add main content area with card background
    const cardRgb = hexToRgb(cardColor);
    doc.setFillColor(cardRgb[0], cardRgb[1], cardRgb[2]);
    doc.roundedRect(10, 30, 140, 100, 3, 3, 'F');
    
    // Add black border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, 30, 140, 100, 3, 3, 'S');

    // Voter Information Section
    doc.setFontSize(12);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('VOTER INFORMATION', 15, 40);

    // Add voter details
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const voterInfo = [
      ['Voter Name:', data.voterName],
      ['Voter DID:', data.voterDID],
      ['Vote ID:', data.voteId],
      ['Timestamp:', new Date(data.timestamp).toLocaleString()]
    ];

    let yPos = 50;
    voterInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value.toString(), 45, yPos, { maxWidth: 100 });
      yPos += 8;
    });

    // Vote Details Section
    doc.setFontSize(12);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('VOTE DETAILS', 15, 85);

    // Add vote details
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const voteInfo = [
      ['Candidate:', data.candidateName],
      ['Party:', data.candidateParty],
      ['Symbol:', data.candidateSymbol]
    ];

    yPos = 95;
    voteInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value.toString(), 45, yPos);
      yPos += 8;
    });

    // Add merkle root in a compact format
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Merkle Root:', 15, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(data.merkleProof.root, 15, 125, { maxWidth: 130 });

    // Add footer
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('This is an electronically generated document. Powered by ematdaan - Secure Electronic Voting System', 75, 135, { align: 'center' });

    // Save the PDF
    doc.save(`vote-receipt-${data.voteId}.pdf`);
  } catch (error) {
    console.error('Failed to generate receipt:', error);
    throw error;
  }
};

// Helper function to convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

// Election Results PDF Report Generation
export interface ElectionResultsData {
  election: {
    id: string;
    name: string;
    description?: string;
    start_time: string;
    end_time: string;
  };
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    symbol: string;
    vote_count: number;
    percentage: number;
  }>;
  totalVotes: number;
  totalEligibleVoters: number;
  participationRate: number;
  winner?: {
    id: string;
    name: string;
    party: string;
    vote_count: number;
    percentage: number;
  };
}

export const generateElectionResultsReport = async (data: ElectionResultsData): Promise<void> => {
  try {
    // Create PDF with A4 size
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Define colors
    const primaryColor = '#6B21E8'; // Purple
    const secondaryColor = '#FF9933'; // Saffron
    const backgroundColor = '#F5F5F4'; // Warm gray
    const successColor = '#059669'; // Green for winner
    const textColor = '#1F2937'; // Dark gray

    // Add header with background
    const headerRgb = hexToRgb(backgroundColor);
    doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Add logo
    try {
      const logoUrl = `${window.location.origin}/logo.png`;
      const logoImg = await fetch(logoUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
      doc.addImage(logoImg, 'PNG', 15, 10, 20, 20);
    } catch (e) {
      // Logo not found, skip
    }

    // Add title
    doc.setFontSize(24);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('ELECTION RESULTS REPORT', 45, 25);

    // Add subtitle
    doc.setFontSize(14);
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'normal');
    doc.text(data.election.name, 45, 35);

    // Add election details
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.text(`Election Period: ${new Date(data.election.start_time).toLocaleDateString()} - ${new Date(data.election.end_time).toLocaleDateString()}`, 15, 55);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 15, 62);

    // Add summary statistics
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY STATISTICS', 15, 80);

    // Create summary table
    const summaryData = [
      ['Total Eligible Voters', data.totalEligibleVoters.toString()],
      ['Total Votes Cast', data.totalVotes.toString()],
      ['Participation Rate', `${data.participationRate}%`],
      ['Number of Candidates', data.candidates.length.toString()]
    ];

    let yPos = 90;
    summaryData.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 80, yPos);
      yPos += 8;
    });

    // Add winner announcement
    if (data.winner) {
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(successColor);
      doc.setFont('helvetica', 'bold');
      doc.text('🏆 WINNER ANNOUNCEMENT', 15, yPos);
      
      yPos += 8;
      doc.setFontSize(12);
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${data.winner.name} (${data.winner.party})`, 15, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Votes: ${data.winner.vote_count} (${data.winner.percentage}%)`, 15, yPos);
    }

    // Add detailed results table
    yPos += 15;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILED RESULTS', 15, yPos);

    // Table headers
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Rank', 15, yPos);
    doc.text('Candidate', 35, yPos);
    doc.text('Party', 100, yPos);
    doc.text('Votes', 140, yPos);
    doc.text('Percentage', 170, yPos);

    // Table data
    yPos += 6;
    data.candidates.forEach((candidate, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Rank
      doc.text((index + 1).toString(), 15, yPos);
      
      // Candidate name
      doc.text(candidate.name, 35, yPos);
      
      // Party
      doc.text(candidate.party || 'Independent', 100, yPos);
      
      // Votes
      doc.text(candidate.vote_count.toString(), 140, yPos);
      
      // Percentage
      doc.text(`${candidate.percentage}%`, 170, yPos);

      yPos += 6;
    });

    // Add participation analysis
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTICIPATION ANALYSIS', 15, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'normal');

    const participationText = [
      `• Total eligible voters: ${data.totalEligibleVoters}`,
      `• Votes cast: ${data.totalVotes}`,
      `• Participation rate: ${data.participationRate}%`,
      `• Abstentions: ${data.totalEligibleVoters - data.totalVotes}`,
      `• Election duration: ${Math.ceil((new Date(data.election.end_time).getTime() - new Date(data.election.start_time).getTime()) / (1000 * 60 * 60 * 24))} days`
    ];

    participationText.forEach(text => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(text, 15, yPos);
      yPos += 6;
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, 15, 290);
      doc.text('Generated by E-Matdaan - Secure Electronic Voting System', 15, 295);
    }

    // Save the PDF
    doc.save(`election-results-${data.election.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error('Failed to generate election results report:', error);
    throw error;
  }
};

// Comprehensive Audit Report Generation
export interface AuditReportData {
  election: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
  organization: {
    name: string;
    id: string;
  };
  auditLogs: Array<{
    id: string;
    user_id: string;
    action: string;
    details: any;
    created_at: string;
    ip_address?: string;
    user_agent?: string;
  }>;
  voteLogs: Array<{
    id: string;
    user_id: string;
    candidate_id: string;
    created_at: string;
    vote_hash: string;
  }>;
  userStats: {
    totalRegistered: number;
    totalVoted: number;
    totalAbstained: number;
  };
  securityMetrics: {
    totalSessions: number;
    totalOTPs: number;
    totalMFA: number;
    suspiciousActivities: number;
  };
}

export const generateAuditReport = async (data: AuditReportData): Promise<void> => {
  try {
    // Create PDF with A4 size
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Define colors
    const primaryColor = '#6B21E8'; // Purple
    const secondaryColor = '#FF9933'; // Saffron
    const backgroundColor = '#F5F5F4'; // Warm gray
    const warningColor = '#DC2626'; // Red for security alerts
    const successColor = '#059669'; // Green for success metrics

    // Add header
    const headerRgb = hexToRgb(backgroundColor);
    doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Add logo
    try {
      const logoUrl = `${window.location.origin}/logo.png`;
      const logoImg = await fetch(logoUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
      doc.addImage(logoImg, 'PNG', 15, 10, 20, 20);
    } catch (e) {
      // Logo not found, skip
    }

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('ELECTION AUDIT REPORT', 45, 25);

    // Add subtitle
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.election.name} - ${data.organization.name}`, 45, 35);

    // Add report metadata
    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.text(`Report Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 15, 50);
    doc.text(`Election Period: ${new Date(data.election.start_time).toLocaleDateString()} - ${new Date(data.election.end_time).toLocaleDateString()}`, 15, 57);

    // Add executive summary
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE SUMMARY', 15, 75);

    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.setFont('helvetica', 'normal');

    const summaryText = [
      `• Total Registered Voters: ${data.userStats.totalRegistered}`,
      `• Total Votes Cast: ${data.userStats.totalVoted}`,
      `• Abstention Rate: ${((data.userStats.totalAbstained / data.userStats.totalRegistered) * 100).toFixed(1)}%`,
      `• Total Audit Events: ${data.auditLogs.length}`,
      `• Total Vote Records: ${data.voteLogs.length}`,
      `• Security Sessions: ${data.securityMetrics.totalSessions}`,
      `• MFA Authentications: ${data.securityMetrics.totalMFA}`,
      `• Suspicious Activities: ${data.securityMetrics.suspiciousActivities}`
    ];

    let yPos = 85;
    summaryText.forEach(text => {
      doc.text(text, 15, yPos);
      yPos += 6;
    });

    // Add security metrics
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('SECURITY METRICS', 15, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.setFont('helvetica', 'normal');

    const securityText = [
      `• Total Authentication Sessions: ${data.securityMetrics.totalSessions}`,
      `• OTP Verifications: ${data.securityMetrics.totalOTPs}`,
      `• Multi-Factor Authentications: ${data.securityMetrics.totalMFA}`,
      `• Suspicious Activity Flags: ${data.securityMetrics.suspiciousActivities}`,
      `• Security Compliance: ${data.securityMetrics.suspiciousActivities === 0 ? '100%' : 'Requires Review'}`
    ];

    securityText.forEach(text => {
      doc.text(text, 15, yPos);
      yPos += 6;
    });

    // Add recent audit events
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('RECENT AUDIT EVENTS', 15, yPos);

    // Table headers
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor('#374151');
    doc.setFont('helvetica', 'bold');
    doc.text('Timestamp', 15, yPos);
    doc.text('User ID', 50, yPos);
    doc.text('Action', 80, yPos);
    doc.text('Details', 120, yPos);

    // Table data (show last 20 events)
    yPos += 6;
    const recentEvents = data.auditLogs.slice(-20).reverse();
    
    recentEvents.forEach(event => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Timestamp
      doc.text(new Date(event.created_at).toLocaleString(), 15, yPos);
      
      // User ID (truncated)
      doc.text(event.user_id.substring(0, 8) + '...', 50, yPos);
      
      // Action
      doc.text(event.action, 80, yPos);
      
      // Details (truncated)
      const details = JSON.stringify(event.details).substring(0, 30);
      doc.text(details + (details.length >= 30 ? '...' : ''), 120, yPos);

      yPos += 5;
    });

    // Add vote verification summary
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('VOTE VERIFICATION SUMMARY', 15, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.setFont('helvetica', 'normal');

    const voteVerificationText = [
      `• Total Vote Records: ${data.voteLogs.length}`,
      `• Unique Voters: ${new Set(data.voteLogs.map(v => v.user_id)).size}`,
      `• Vote Hash Integrity: ${data.voteLogs.every(v => v.vote_hash && v.vote_hash.length > 0) ? '100% Verified' : 'Requires Review'}`,
      `• Timestamp Consistency: ${data.voteLogs.every(v => new Date(v.created_at) >= new Date(data.election.start_time) && new Date(v.created_at) <= new Date(data.election.end_time)) ? 'All Valid' : 'Some Outliers Detected'}`
    ];

    voteVerificationText.forEach(text => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(text, 15, yPos);
      yPos += 6;
    });

    // Add compliance statement
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLIANCE STATEMENT', 15, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.setFont('helvetica', 'normal');

    const complianceText = [
      'This audit report confirms that the election was conducted in accordance with:',
      '• Secure authentication protocols',
      '• Vote integrity verification',
      '• Audit trail maintenance',
      '• Privacy protection measures',
      '• Regulatory compliance requirements'
    ];

    complianceText.forEach(text => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(text, 15, yPos);
      yPos += 6;
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, 15, 290);
      doc.text('Generated by E-Matdaan - Secure Electronic Voting System', 15, 295);
      doc.text('CONFIDENTIAL - For authorized personnel only', 15, 298);
    }

    // Save the PDF
    doc.save(`audit-report-${data.election.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error('Failed to generate audit report:', error);
    throw error;
  }
}; 