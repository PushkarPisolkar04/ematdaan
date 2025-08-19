import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.VITE_SMTP_HOST,
  port: parseInt(process.env.VITE_SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.VITE_SMTP_USER,
    pass: process.env.VITE_SMTP_PASS,
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, organizationName, accessCodes } = req.body;

  try {
    await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: `Your ${organizationName} Organization Access Codes`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 ${organizationName} Organization Created Successfully!</h2>
          
          <p>Your organization has been created successfully. Here are your access codes:</p>
          
          <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin-top: 0;">📋 Access Codes</h3>
            
            <div style="margin: 15px 0;">
              <strong style="color: #059669;">Voter Code:</strong>
              <div style="background-color: #ecfdf5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 16px; margin-top: 5px;">
                ${accessCodes.voterCode}
              </div>
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #dc2626;">Admin Code:</strong>
              <div style="background-color: #fef2f2; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 16px; margin-top: 5px;">
                ${accessCodes.adminCode}
              </div>
            </div>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-top: 0;">💡 How to Use:</h4>
            <ul style="color: #92400e;">
              <li>Share the <strong>Voter Code</strong> with your members so they can register and vote</li>
              <li>Share the <strong>Admin Code</strong> with trusted administrators who can manage elections</li>
              <li>Keep these codes secure and don't share them publicly</li>
            </ul>
          </div>
          
          ${accessCodes.invitationLink ? `
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin-top: 0;">🔗 Invitation Link</h4>
            <p style="color: #0c4a6e;">Share this link with administrators to invite them directly:</p>
            <div style="background-color: #ecfdf5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; word-break: break-all;">
              ${accessCodes.invitationLink}
            </div>
          </div>
          ` : ''}
          
          <p style="color: #6b7280; margin-top: 20px;">
            You can now log in to your admin dashboard to create and manage elections.
          </p>
          
          <p style="color: #6b7280;">
            If you have any questions, please contact support.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'Access codes sent successfully' });
  } catch (error) {
    console.error('Failed to send access codes:', error);
    return res.status(500).json({ success: false, message: 'Failed to send access codes' });
  }
} 