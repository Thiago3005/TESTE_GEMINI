import { MoneyBox } from '../types';

const handleUpdateMoneyBox = (moneyBox: Omit<MoneyBox, "user_id" | "created_at" | "updated_at">) => {
  // ... existing code ...
}; 