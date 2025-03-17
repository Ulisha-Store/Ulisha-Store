import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const order = JSON.parse(formData.get('order') as string);
    const csvFile = formData.get('csv') as File;
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;

    const csvContent = await csvFile.text();
    
    // Create email content
    const emailContent = `
      New Order Received
      
      Order ID: ${order.id}
      Customer: ${order.delivery_name}
      Phone: ${order.delivery_phone}
      Address: ${order.delivery_address}
      Total: NGN ${order.total}
      
      Payment Method: ${order.payment_method}
      Payment Reference: ${order.payment_ref}
      
      Please find the order details in the attached CSV file.
    `;

    // Initialize SMTP client
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOST') || '',
      port: 587,
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    });

    // Send email with CSV attachment
    await client.send({
      from: 'orders@ulishastore.com',
      to: [to],
      subject: subject,
      content: emailContent,
      attachments: [{
        filename: `order-${order.id}.csv`,
        content: csvContent,
        contentType: 'text/csv',
      }],
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});