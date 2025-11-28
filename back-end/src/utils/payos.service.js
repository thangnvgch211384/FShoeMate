const { PayOS } = require("@payos/node");

function getPayOSClient() {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) {
    throw new Error("PayOS credentials not configured. Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env file");
  }

  return new PayOS({
    clientId,
    apiKey,
    checksumKey
  });
}

async function createPaymentLink(orderData) {
  try {
    const timestamp = Date.now();
    const orderCode = parseInt(timestamp.toString().slice(-10), 10);
    
    const paymentData = {
      orderCode: orderCode,
      amount: Math.round(orderData.amount),
      description: orderData.description,
      items: (orderData.items || []).map(item => ({
        name: item.name || " ",
        quantity: item.quantity || 1,
        price: Math.round(item.price || 0)
      })),
      returnUrl: orderData.returnUrl,
      cancelUrl: orderData.cancelUrl,
      buyerName: orderData.customerInfo?.name || "Customer",
      buyerEmail: orderData.customerInfo?.email || "",
      buyerPhone: orderData.customerInfo?.phone || "",
      buyerAddress: orderData.customerInfo?.address || "",
    };

    const payOS = getPayOSClient();
    const paymentLinkData = await payOS.paymentRequests.create(paymentData);
    return paymentLinkData;
  } catch (error) {
    console.error("PayOS createPaymentLink error:", error);
    
    // Xử lý lỗi cụ thể từ PayOS
    if (error.code === '214') {
      const detailedError = new Error(
        "PayOS Payment Channel Error: Cổng thanh toán không tồn tại hoặc đã tạm dừng.\n\n" +
        "Vui lòng kiểm tra:\n" +
        "1. Đăng nhập PayOS Dashboard: https://my.payos.vn/login\n" +
        "2. Vào 'Kênh thanh toán' và kiểm tra:\n" +
        "   - Kênh thanh toán đã được kích hoạt (Active)\n" +
        "   - Kênh thanh toán chưa bị tạm dừng hoặc xóa\n" +
        "3. Kiểm tra credentials trong .env:\n" +
        "   - PAYOS_CLIENT_ID phải đúng với Client ID trong dashboard\n" +
        "   - PAYOS_API_KEY phải đúng với API Key trong dashboard\n" +
        "   - PAYOS_CHECKSUM_KEY phải đúng với Checksum Key trong dashboard\n" +
        "4. Nếu đã tạo kênh mới, đảm bảo đã copy đúng credentials"
      );
      detailedError.code = error.code;
      detailedError.originalError = error;
      throw detailedError;
    }
    
    // Xử lý các lỗi khác
    if (error.code) {
      const errorMessage = error.desc || error.message || "Unknown PayOS error";
      const detailedError = new Error(`PayOS Error (code: ${error.code}): ${errorMessage}`);
      detailedError.code = error.code;
      detailedError.originalError = error;
      throw detailedError;
    }
    
    throw error;
  }
}

function verifyWebhook(webhookData) {
  try {
    return true;
  } catch (error) {
    console.error("PayOS webhook verification error:", error);
    return false;
  }
}

async function getPaymentInfo(orderCode) {
  try {
    const payOS = getPayOSClient();
    const paymentInfo = await payOS.paymentRequests.get(orderCode);
    return paymentInfo;
  } catch (error) {
    console.error("PayOS getPaymentInfo error:", error);
    throw error;
  }
}

async function cancelPaymentLink(orderCode) {
  try {
    const payOS = getPayOSClient();
    const result = await payOS.paymentRequests.cancel(orderCode, "Cancel order");
    return result;
  } catch (error) {
    console.error("PayOS cancelPaymentLink error:", error);
    throw error;
  }
}

module.exports = {
  createPaymentLink,
  verifyWebhook,
  getPaymentInfo,
  cancelPaymentLink,
};

