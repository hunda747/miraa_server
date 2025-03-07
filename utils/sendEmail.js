const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Replace template variables with actual values
 * @param {string} template - HTML template with {{variable}} placeholders
 * @param {Object} variables - Object containing variable values
 * @returns {string} - Processed HTML with variables replaced
 */
const processTemplate = (template, variables) => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return variables[variable] || match;
  });
};

/**
 * Send an email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body (optional if html is provided)
 * @param {string} options.html - HTML email body (optional if text is provided)
 * @param {string} options.template - Path to HTML template file (relative to views directory)
 * @param {Object} options.variables - Variables to replace in the template
 * @param {string} options.from - Sender email address (optional, defaults to config)
 * @param {Array} options.attachments - Array of attachment objects (optional)
 * @returns {Promise} - Resolves with info about the sent email or rejects with error
 */
const sendEmail = async (options) => {
  // Create a transporter using environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Process HTML template if provided
  let htmlContent = options.html;
  if (options.template) {
    try {
      const templatePath = path.join(process.cwd(), 'views', options.template);
      const template = await fs.readFile(templatePath, 'utf8');
      htmlContent = processTemplate(template, options.variables || {});
    } catch (error) {
      console.error('Error loading email template:', error);
      throw new Error(`Failed to load email template: ${error.message}`);
    }
  }

  // Add logo to attachments if not already included
  const attachments = options.attachments || [];
  const hasLogo = attachments.some(attachment => attachment.cid === 'logo');

  if (!hasLogo && htmlContent && htmlContent.includes('cid:logo')) {
    attachments.push({
      filename: 'direlogo.png',
      path: path.join(process.cwd(), 'public', 'logo', 'direlogo.png'),
      cid: 'logo'
    });
  }

  // Define email options
  const mailOptions = {
    from: options.from || process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: htmlContent,
    attachments
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;
