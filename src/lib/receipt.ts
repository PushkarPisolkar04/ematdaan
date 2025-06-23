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