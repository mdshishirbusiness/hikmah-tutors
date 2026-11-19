// The right pane on a computer before a chat is picked, like WhatsApp Web. Hidden on a phone (the list fills it).
import { Bot, Lock } from "lucide-react";
import { WA } from "~/components/wa-ui";

export default function NoChat() {
  return (
    <section className="hidden flex-col items-center justify-center gap-4 px-10 text-center lg:flex" style={{ background: WA.bar }}>
      <span className="grid size-20 place-items-center rounded-full bg-white shadow-ring" style={{ color: WA.teal }}><Bot size={38} /></span>
      <h2 className="text-[28px] font-light text-[#41525d]">Hikmah WhatsApp</h2>
      <p className="max-w-md text-sm leading-relaxed text-[#667781]">
        বাঁ দিক থেকে একটি চ্যাট খুলুন। AI গার্ডিয়ানদের উত্তর দেয় ও লিড বানায়; কল চাইলে, অভিযোগ বা দর কষাকষি হলে চ্যাট "Needs you"-তে আসে।
      </p>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-[#8696a0]"><Lock size={12} aria-hidden />Only Hikmah staff can see these chats.</p>
    </section>
  );
}
