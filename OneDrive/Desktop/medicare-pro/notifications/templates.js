module.exports = {
  PATIENT_REGISTERED: (patient) => ({
    title: '🏥 Welcome to MediCare Pro',
    body: `Hello ${patient.name}! Your account (ID: ${patient.patient_id}) is ready. Log in to the patient portal with your ID.`,
    type: 'registration',
  }),
  APPOINTMENT_SCHEDULED: (patient, appt) => ({
    title: '📅 Appointment Confirmed',
    body: `Your appointment is on ${appt.appointment_date} at ${appt.appointment_time}. Please arrive 10 min early.`,
    type: 'appointment',
  }),
  APPOINTMENT_CANCELLED: (patient, appt) => ({
    title: '❌ Appointment Cancelled',
    body: `Your appointment on ${appt.appointment_date} at ${appt.appointment_time} has been cancelled. Contact us to reschedule.`,
    type: 'appointment_cancelled',
  }),
  REPORT_READY: (patient, report) => ({
    title: '📋 Medical Report Ready',
    body: `Your ${report.report_type} report "${report.title}" is ready. Log in to download it.`,
    type: 'report',
  }),
  BILL_GENERATED: (patient, bill) => ({
    title: '💳 New Bill Generated',
    body: `A bill of ₹${bill.total} (${bill.bill_number}) has been generated. Log in to view and pay.`,
    type: 'bill',
  }),
  PAYMENT_RECEIVED: (patient, bill) => ({
    title: '✅ Payment Confirmed',
    body: `Payment of ₹${bill.paid_amount} received for ${bill.bill_number}. Thank you!`,
    type: 'payment',
  }),
};
