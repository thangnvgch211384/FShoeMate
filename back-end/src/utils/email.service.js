const nodemailer = require("nodemailer");

// Tạo transporter khi cần (lazy initialization)
function getTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error("Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

async function sendPasswordResetEmail(email, resetToken) {
  // Kiểm tra env vars trước
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD in .env file");
  }

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Password - ShoeFam",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  };

  const transporter = getTransporter();
  await transporter.sendMail(mailOptions);
}

async function sendOrderConfirmationEmail(email, resetToken) {
  // Kiểm tra env vars trước
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD in .env file");
  }

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Password - ShoeFam",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  };

  const transporter = getTransporter();
  await transporter.sendMail(mailOptions);
}

async function sendOrderConfirmationEmail(order, userEmail, userName) {
  // Kiểm tra env vars trước
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("Email configuration missing. Order confirmation email will not be sent.");
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const orderNumber = order._id.toString().slice(-6).toUpperCase();
  const orderId = order._id.toString();
  const orderDate = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build order items HTML
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <img src="${item.productSnapshot.image || ''}" alt="${item.productSnapshot.name}" 
             style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <div style="font-weight: 600;">${item.productSnapshot.name}</div>
        <div style="color: #666; font-size: 12px; margin-top: 4px;">
          Size: ${item.productSnapshot.size} • Color: ${item.productSnapshot.color}
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${(item.productSnapshot.price * item.quantity).toLocaleString('vi-VN')}₫
      </td>
    </tr>
  `).join('');

  // Determine order view URL
  const orderViewUrl = order.userId 
    ? `${frontendUrl}/orders/${orderId}`
    : `${frontendUrl}/track-order`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Order Confirmation #${orderNumber} - ShoeFam`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">Order Confirmed!</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          <p style="color: #666; line-height: 1.6;">
            We've received your order and are preparing it for shipment. Here are your order details:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="margin-bottom: 10px;">
              <strong>Order Number:</strong> #${orderNumber}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Order Date:</strong> ${orderDate}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Payment Method:</strong> ${order.paymentMethod === 'payos' ? 'Online Payment (PayOS)' : 'Cash on Delivery (COD)'}
            </div>
            <div>
              <strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </div>
          </div>

          <h2 style="color: #333; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Order Items</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Image</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Subtotal:</span>
              <strong>${order.totals.subtotal.toLocaleString('vi-VN')}₫</strong>
            </div>
            ${order.totals.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #e74c3c;">
              <span>Discount:</span>
              <strong>-${order.totals.discount.toLocaleString('vi-VN')}₫</strong>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Shipping:</span>
              <strong>${order.totals.shippingFee > 0 ? order.totals.shippingFee.toLocaleString('vi-VN') + '₫' : 'Free'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px; font-weight: bold;">
              <span>Total:</span>
              <span style="color: #667eea;">${order.totals.total.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          ${order.guestInfo ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <strong>Shipping Address:</strong><br>
            ${order.guestInfo.name}<br>
            ${order.guestInfo.address}<br>
            ${order.guestInfo.phone ? `Phone: ${order.guestInfo.phone}` : ''}
          </div>
          ` : ''}

          ${order.paymentMethod === 'payos' && order.paymentStatus === 'pending' && order.status !== 'cancelled' ? `
          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
            <strong>Payment Pending:</strong><br>
            Please complete your payment to proceed with your order.
            ${order.metadata?.payosPaymentLink ? `
            <a href="${order.metadata.payosPaymentLink}" 
               style="display: inline-block; margin-top: 10px; padding: 10px 20px; background: #0c5460; color: #fff; text-decoration: none; border-radius: 4px;">
              Complete Payment
            </a>
            ` : ''}
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderViewUrl}" 
               style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Order Details
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            If you have any questions, please contact our support team.<br>
            Order ID: ${orderId}
          </p>
        </div>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    
  }
}

async function sendOrderCancellationEmail(order, userEmail, userName) {
  // Kiểm tra env vars trước
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("Email configuration missing. Order cancellation email will not be sent.");
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const orderNumber = order._id.toString().slice(-6).toUpperCase();
  const orderDate = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Order Cancelled #${orderNumber} - ShoeFam`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">Order Cancelled</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 16px;">Your order has been cancelled</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          <p style="color: #666; line-height: 1.6;">
            We're writing to inform you that your order has been cancelled.
          </p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <div style="margin-bottom: 10px;">
              <strong>Order Number:</strong> #${orderNumber}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Order Date:</strong> ${orderDate}
            </div>
            <div>
              <strong>Status:</strong> <span style="color: #e74c3c; font-weight: bold;">Cancelled</span>
            </div>
          </div>

          ${order.paymentMethod === 'payos' && order.paymentStatus === 'failed' ? `
          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
            <strong>Payment Information:</strong><br>
            Your payment has been cancelled. If you were charged, the refund will be processed within 5-7 business days.
          </div>
          ` : ''}

          <p style="color: #666; line-height: 1.6; margin-top: 20px;">
            If you have any questions or concerns, please contact our support team.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/track-order" 
               style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Track Another Order
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            Thank you for your understanding.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send order cancellation email:", error);
    throw error;
  }
}

async function sendOrderReceivedEmail(order, userEmail, userName) {
  // Kiểm tra env vars trước
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("Email configuration missing. Order received email will not be sent.");
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const orderNumber = order._id.toString().slice(-6).toUpperCase();
  const orderId = order._id.toString();
  const orderDate = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build order items HTML
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <img src="${item.productSnapshot.image || ''}" alt="${item.productSnapshot.name}" 
             style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <div style="font-weight: 600;">${item.productSnapshot.name}</div>
        <div style="color: #666; font-size: 12px; margin-top: 4px;">
          Size: ${item.productSnapshot.size} • Color: ${item.productSnapshot.color}
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${(item.productSnapshot.price * item.quantity).toLocaleString('vi-VN')}₫
      </td>
    </tr>
  `).join('');

  // Determine order view URL
  const orderViewUrl = order.userId 
    ? `${frontendUrl}/orders/${orderId}`
    : `${frontendUrl}/track-order`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Order Received #${orderNumber} - Payment Required - ShoeFam`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">Order Received</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 16px;">Payment Required</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          <p style="color: #666; line-height: 1.6;">
            We've received your order. To complete your purchase, please complete the payment using the link below.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="margin-bottom: 10px;">
              <strong>Order Number:</strong> #${orderNumber}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Order Date:</strong> ${orderDate}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Payment Method:</strong> Online Payment (PayOS)
            </div>
            <div>
              <strong>Status:</strong> <span style="color: #f39c12; font-weight: bold;">Payment Pending</span>
            </div>
          </div>

          <h2 style="color: #333; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Order Items</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Image</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Subtotal:</span>
              <strong>${order.totals.subtotal.toLocaleString('vi-VN')}₫</strong>
            </div>
            ${order.totals.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #e74c3c;">
              <span>Discount:</span>
              <strong>-${order.totals.discount.toLocaleString('vi-VN')}₫</strong>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Shipping:</span>
              <strong>${order.totals.shippingFee > 0 ? order.totals.shippingFee.toLocaleString('vi-VN') + '₫' : 'Free'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px; font-weight: bold;">
              <span>Total:</span>
              <span style="color: #667eea;">${order.totals.total.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          ${order.guestInfo ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <strong>Shipping Address:</strong><br>
            ${order.guestInfo.name}<br>
            ${order.guestInfo.address}<br>
            ${order.guestInfo.phone ? `Phone: ${order.guestInfo.phone}` : ''}
          </div>
          ` : ''}

          ${order.metadata?.payosPaymentLink ? `
          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460; text-align: center;">
            <strong style="display: block; margin-bottom: 15px; font-size: 18px;">Complete Your Payment</strong>
            <p style="color: #666; margin-bottom: 15px;">
              Please complete your payment to proceed with your order. Your order will be confirmed once payment is successful.
            </p>
            <a href="${order.metadata.payosPaymentLink}" 
               style="display: inline-block; padding: 14px 28px; background: #0c5460; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Complete Payment Now
            </a>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderViewUrl}" 
               style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Order Details
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            If you have any questions, please contact our support team.<br>
            Order ID: ${orderId}
          </p>
        </div>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send order received email:", error);
  }
}

module.exports = { 
  sendPasswordResetEmail, 
  sendOrderConfirmationEmail, 
  sendOrderCancellationEmail,
  sendOrderReceivedEmail 
};

