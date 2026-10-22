import { useState } from "react";
import { Mail, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { changePassword } from "../../auth/api/authApi";
import { getErrorMessage } from "../../../lib/errorMessage";
import InlineNotice from "../../../components/ui/InlineNotice";

function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handlePasswordChange(event) {
    event.preventDefault();
    setMessage(""); setError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Complete all three password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("The new password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to change the password. Please check your current password and try again."));
    } finally {
      setIsSavingPassword(false);
    }
  }

  const username = user?.username || user?.name || "";
  const email = user?.email || "";

  return (
    <div>
      <h1 className="cognitive-heading mb-[33px] text-[28px] leading-[1.2] text-[#171d2b]">Profile Settings</h1>

      <section className="rounded-[9px] border border-[#e3e6e9] bg-white px-[28px] pb-[28px] pt-[31px]">
        <h2 className="mb-[23px] text-[20px] font-semibold tracking-[-0.035em] text-[#1d2430]">User Information</h2>
        <div className="space-y-[18px]">
          <div>
            <label htmlFor="profile-username" className="mb-[8px] block text-[13px] font-medium text-[#343c48]">Username</label>
            <div className="relative"><UserRound size={18} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#a7adb5]" /><input id="profile-username" value={username} readOnly className="h-[43px] w-full rounded-[10px] border border-[#e3e6e9] bg-[#fafafa] pl-[43px] pr-[14px] text-[14px] text-[#27303c] outline-none" /></div>
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-[8px] block text-[13px] font-medium text-[#343c48]">Email Address</label>
            <div className="relative"><Mail size={18} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#a7adb5]" /><input id="profile-email" value={email} readOnly className="h-[43px] w-full rounded-[10px] border border-[#e3e6e9] bg-[#fafafa] pl-[43px] pr-[14px] text-[14px] text-[#27303c] outline-none" /></div>
          </div>
        </div>
      </section>

      <section className="mt-[38px] rounded-[9px] border border-[#e3e6e9] bg-white px-[28px] pb-[28px] pt-[31px]">
        <h2 className="mb-[23px] text-[20px] font-semibold tracking-[-0.035em] text-[#1d2430]">Change Password</h2>
        {error && <InlineNotice className="mb-5">{error}</InlineNotice>}
        {message && <InlineNotice type="success" className="mb-5">{message}</InlineNotice>}
        <form onSubmit={handlePasswordChange} className="space-y-[18px]">
          <div>
            <label htmlFor="current-password" className="mb-[8px] block text-[13px] font-medium text-[#343c48]">Current Password</label>
            <div className="relative"><LockKeyhole size={18} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#a7adb5]" /><input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-[43px] w-full rounded-[10px] border border-[#e3e6e9] bg-white pl-[43px] pr-[14px] text-[14px] outline-none focus:border-[#0dbb9a]" /></div>
          </div>
          <div>
            <label htmlFor="new-password" className="mb-[8px] block text-[13px] font-medium text-[#343c48]">New Password</label>
            <div className="relative"><LockKeyhole size={18} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#a7adb5]" /><input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-[43px] w-full rounded-[10px] border border-[#e3e6e9] bg-white pl-[43px] pr-[14px] text-[14px] outline-none focus:border-[#0dbb9a]" /></div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-[8px] block text-[13px] font-medium text-[#343c48]">Confirm New Password</label>
            <div className="relative"><LockKeyhole size={18} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#a7adb5]" /><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-[43px] w-full rounded-[10px] border border-[#e3e6e9] bg-white pl-[43px] pr-[14px] text-[14px] outline-none focus:border-[#0dbb9a]" /></div>
          </div>
          <div className="flex justify-end pt-[1px]"><button type="submit" disabled={isSavingPassword} className="cognitive-primary min-h-[53px] px-[24px] disabled:cursor-not-allowed disabled:opacity-60">{isSavingPassword ? "Changing Password..." : "Change Password"}</button></div>
        </form>
      </section>
    </div>
  );
}

export default ProfilePage;
