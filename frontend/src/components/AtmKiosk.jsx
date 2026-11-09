import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  Cpu, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import ScreenCardInsert from './ScreenCardInsert';
import ScreenPinEntry from './ScreenPinEntry';
import ScreenHome from './ScreenHome';
import ScreenTransaction from './ScreenTransaction';
import ScreenApproval from './ScreenApproval';
import ReceiptModal from './ReceiptModal';
import { api } from '../services/api';
import { browserSimulator } from '../services/verilogEngine';
import { playKeyBeep } from '../utils/audio';

export default function AtmKiosk({ onResetTriggered }) {
  // ATM Screen States: CARD_INSERT | PIN_ENTRY | HOME | TRANSACTION | APPROVAL
  const [atmState, setAtmState] = useState('CARD_INSERT');
  const [activeCardId, setActiveCardId] = useState('');
  const [accountData, setAccountData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [lastTxResult, setLastTxResult] = useState(null);
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);

  // Card Verification Handler (FR-01)
  const handleCardVerified = async (cardId) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.insertCard(cardId);
      if (res.valid) {
        setActiveCardId(cardId);
        setFailedPinAttempts(res.failed_attempts || 0);
        setAccountData({
          card_id: cardId,
          account_holder: res.account_holder,
          is_locked: res.is_locked,
          failed_attempts: res.failed_attempts
        });
        setAtmState('PIN_ENTRY');
      } else {
        setErrorMessage(res.message);
      }
    } catch (e) {
      // Local fallback
      const localAcc = browserSimulator.accounts.find(a => a.card === Number(cardId));
      if (localAcc) {
        if (localAcc.locked) {
          setErrorMessage('Account is blocked due to 3 failed PIN attempts.');
        } else {
          setActiveCardId(cardId);
          setFailedPinAttempts(localAcc.attempts);
          setAccountData({
            card_id: cardId,
            account_holder: localAcc.name,
            is_locked: localAcc.locked,
            failed_attempts: localAcc.attempts
          });
          setAtmState('PIN_ENTRY');
        }
      } else {
        setErrorMessage(`Card ID ${cardId} is not recognized.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // PIN Submission Handler (FR-02, FR-03, FR-04)
  const handlePinSubmit = async (pin) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.submitPin(activeCardId, pin);
      if (res.authenticated) {
        setAccountData(res.account);
        // Fetch recent transactions
        loadTransactions(activeCardId);
        setAtmState('HOME');
      } else {
        setFailedPinAttempts(res.failed_attempts);
        setErrorMessage(res.message);
        if (res.is_locked) {
          setTimeout(() => {
            handleResetToCardInsert();
          }, 3500);
        }
      }
    } catch (e) {
      // Local fallback
      const localAcc = browserSimulator.accounts.find(a => a.card === Number(activeCardId));
      if (localAcc) {
        if (localAcc.pin === Number(pin)) {
          localAcc.attempts = 0;
          setAccountData({
            card_id: String(localAcc.card),
            account_holder: localAcc.name,
            balance: localAcc.bal,
            opening_balance: 5000,
            daily_limit: localAcc.limit,
            daily_withdrawn: localAcc.spent,
            is_locked: false,
            failed_attempts: 0
          });
          setAtmState('HOME');
        } else {
          localAcc.attempts += 1;
          setFailedPinAttempts(localAcc.attempts);
          if (localAcc.attempts >= 3) {
            localAcc.locked = true;
            setErrorMessage('SECURITY LOCKOUT: 3 incorrect PIN attempts. Card is now LOCKED.');
          } else {
            setErrorMessage(`Incorrect PIN. ${3 - localAcc.attempts} attempt(s) remaining.`);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (cid) => {
    try {
      const txs = await api.getTransactions(cid, 8);
      setTransactions(txs);
    } catch (e) {
      setTransactions([]);
    }
  };

  // Action Selection (Withdraw, Deposit, etc.)
  const handleSelectAction = (actionId) => {
    setSelectedAction(actionId);
    setAtmState('TRANSACTION');
  };

  // Execute Transaction (FR-05 to FR-12)
  const handleSubmitTransaction = async ({ txType, amount, targetCardId }) => {
    setIsLoading(true);
    try {
      const res = await api.executeTransaction({
        cardId: activeCardId,
        txType,
        amount,
        targetCardId
      });

      setLastTxResult(res);
      if (res.account) {
        setAccountData(res.account);
      }
      setAtmState('APPROVAL');
      loadTransactions(activeCardId);
    } catch (e) {
      // Local fallback execution via browser simulator
      const simTypeMap = { 'WITHDRAW': 0, 'DEPOSIT': 1, 'BALANCE_ENQUIRY': 2, 'TRANSFER': 3, 'INTEREST': 4 };
      const localRes = browserSimulator.runSimulation({
        cardId: Number(activeCardId),
        pin: 123456,
        txType: simTypeMap[txType] ?? 0,
        amount: Number(amount),
        targetCard: Number(targetCardId)
      });

      const fakeResult = {
        success: localRes.approved,
        approved: localRes.approved,
        reject_code: localRes.rejectCode,
        reject_reason: localRes.rejectReason,
        message: localRes.approved ? 'Transaction Completed Successfully' : (localRes.rejectReason || 'Transaction Rejected'),
        receipt_no: `REC-${activeCardId.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
        account: {
          ...accountData,
          balance: localRes.finalBalance,
          daily_withdrawn: localRes.dailyWithdrawn
        },
        transaction: {
          tx_type: txType,
          amount: Number(amount),
          balance_before: accountData?.balance || 5000,
          balance_after: localRes.finalBalance,
          receipt_no: `REC-${activeCardId.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
          approved: localRes.approved,
          timestamp: new Date().toISOString()
        }
      };

      setLastTxResult(fakeResult);
      setAccountData(fakeResult.account);
      setAtmState('APPROVAL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToCardInsert = () => {
    setAtmState('CARD_INSERT');
    setActiveCardId('');
    setAccountData(null);
    setErrorMessage('');
    setSelectedAction(null);
    setLastTxResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* ATM Exterior Kiosk Bezel & Chassis */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 border-4 border-slate-750 rounded-[2.5rem] p-4 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Top Header Canopy */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/50" />
            <span className="font-['Chakra_Petch'] font-bold text-sm text-slate-300 tracking-wider">
              ATM TERMINAL #01 • KARUNYA DIGITAL DSD
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            <span className="text-xs font-mono text-teal-400 font-semibold">
              FSM 10-STATE SECURE
            </span>
          </div>
        </div>

        {/* Inner Screen Display (Curved ATM Monitor) */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 sm:p-7 shadow-inner relative min-h-[460px] flex flex-col justify-center">
          
          {atmState === 'CARD_INSERT' && (
            <ScreenCardInsert
              onCardVerified={handleCardVerified}
              errorMsg={errorMessage}
              isLoading={isLoading}
            />
          )}

          {atmState === 'PIN_ENTRY' && (
            <ScreenPinEntry
              cardId={activeCardId}
              accountHolder={accountData?.account_holder}
              failedAttempts={failedPinAttempts}
              errorMsg={errorMessage}
              onPinSubmit={handlePinSubmit}
              onCancel={handleResetToCardInsert}
              isLoading={isLoading}
            />
          )}

          {atmState === 'HOME' && (
            <ScreenHome
              account={accountData}
              transactions={transactions}
              onSelectAction={handleSelectAction}
              onLogout={handleResetToCardInsert}
              onViewReceipt={(tx) => setViewingReceiptTx(tx)}
            />
          )}

          {atmState === 'TRANSACTION' && (
            <ScreenTransaction
              actionType={selectedAction}
              account={accountData}
              onBack={() => setAtmState('HOME')}
              onSubmitTransaction={handleSubmitTransaction}
              isLoading={isLoading}
            />
          )}

          {atmState === 'APPROVAL' && (
            <ScreenApproval
              result={lastTxResult}
              onDone={handleResetToCardInsert}
              onViewReceipt={(tx) => setViewingReceiptTx(tx || lastTxResult?.transaction)}
            />
          )}
        </div>

        {/* Lower Kiosk Features: Card Slot LED & Thermal Dispenser Slot */}
        <div className="mt-6 pt-5 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center space-x-3">
            <div className="h-4 w-28 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center relative overflow-hidden">
              <span className={`h-1.5 w-8 rounded-full ${
                atmState === 'CARD_INSERT' ? 'bg-teal-400 animate-pulse' : 'bg-slate-700'
              }`} />
            </div>
            <span>Card Reader Port (32-Bit BCD)</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="h-3 w-32 bg-slate-950 border border-slate-800 rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-slate-600">RECEIPT DISPENSER</span>
            </div>
            <span>Thermal Strobe (FR-12)</span>
          </div>
        </div>

      </div>

      {/* Printable Receipt Modal */}
      {viewingReceiptTx && (
        <ReceiptModal
          transaction={viewingReceiptTx}
          onClose={() => setViewingReceiptTx(null)}
        />
      )}

    </div>
  );
}

