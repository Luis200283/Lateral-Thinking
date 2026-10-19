"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  label?: string;
  className?: string;
}

interface EmojiOption {
  char: string;
  name: string;
}

interface EmojiGroup {
  title: string;
  emojis: readonly EmojiOption[];
}

const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    title: "Caras",
    emojis: [
      { char: "😀", name: "Cara sonriente" },
      { char: "😃", name: "Cara sonriente con ojos grandes" },
      { char: "😄", name: "Cara muy sonriente" },
      { char: "😁", name: "Cara radiante" },
      { char: "😆", name: "Cara riendo a carcajadas" },
      { char: "😅", name: "Cara sonriente con sudor" },
      { char: "😂", name: "Cara llorando de risa" },
      { char: "🤣", name: "Cara revolcándose de risa" },
      { char: "🙂", name: "Cara con leve sonrisa" },
      { char: "😊", name: "Cara sonrojada y feliz" },
      { char: "😇", name: "Cara con aureola" },
      { char: "🙃", name: "Cara al revés" },
      { char: "😉", name: "Cara guiñando un ojo" },
      { char: "😌", name: "Cara aliviada" },
      { char: "😍", name: "Cara con ojos de corazón" },
      { char: "🥰", name: "Cara enamorada" },
      { char: "😘", name: "Cara lanzando un beso" },
      { char: "😜", name: "Cara sacando la lengua y guiñando" },
      { char: "🤪", name: "Cara alocada" },
      { char: "🤔", name: "Cara pensativa" },
      { char: "🤨", name: "Cara con ceja levantada" },
      { char: "😐", name: "Cara neutral" },
      { char: "😴", name: "Cara durmiendo" },
      { char: "😎", name: "Cara con gafas de sol" },
      { char: "🥳", name: "Cara de fiesta" },
      { char: "🤯", name: "Cara explotando" },
      { char: "🥺", name: "Cara suplicante" },
      { char: "😭", name: "Cara llorando a gritos" },
    ],
  },
  {
    title: "Gestos y manos",
    emojis: [
      { char: "👍", name: "Pulgar arriba" },
      { char: "👎", name: "Pulgar abajo" },
      { char: "👏", name: "Manos aplaudiendo" },
      { char: "🙌", name: "Manos celebrando" },
      { char: "🙏", name: "Manos juntas de gratitud" },
      { char: "🤝", name: "Apretón de manos" },
      { char: "✌️", name: "Mano con signo de victoria" },
      { char: "🤞", name: "Dedos cruzados" },
      { char: "👌", name: "Mano con señal de perfecto" },
      { char: "🤙", name: "Mano con gesto de llamada" },
      { char: "💪", name: "Brazo flexionando el bíceps" },
      { char: "🖖", name: "Saludo vulcano" },
      { char: "👋", name: "Mano saludando" },
      { char: "✋", name: "Mano levantada" },
      { char: "🫶", name: "Manos formando un corazón" },
      { char: "🤟", name: "Gesto de te quiero" },
    ],
  },
  {
    title: "Corazones y símbolos",
    emojis: [
      { char: "❤️", name: "Corazón rojo" },
      { char: "🧡", name: "Corazón naranja" },
      { char: "💛", name: "Corazón amarillo" },
      { char: "💚", name: "Corazón verde" },
      { char: "💙", name: "Corazón azul" },
      { char: "💜", name: "Corazón morado" },
      { char: "🖤", name: "Corazón negro" },
      { char: "🤍", name: "Corazón blanco" },
      { char: "💖", name: "Corazón brillante" },
      { char: "💔", name: "Corazón roto" },
      { char: "✨", name: "Destellos" },
      { char: "⭐", name: "Estrella" },
      { char: "🔥", name: "Fuego" },
      { char: "💯", name: "Cien puntos" },
      { char: "✅", name: "Marca de verificación" },
      { char: "❌", name: "Cruz de error" },
      { char: "❗", name: "Signo de exclamación" },
      { char: "❓", name: "Signo de interrogación" },
      { char: "♻️", name: "Símbolo de reciclaje" },
    ],
  },
  {
    title: "Naturaleza y animales",
    emojis: [
      { char: "🐶", name: "Cara de perro" },
      { char: "🐱", name: "Cara de gato" },
      { char: "🐭", name: "Cara de ratón" },
      { char: "🐹", name: "Cara de hámster" },
      { char: "🐰", name: "Cara de conejo" },
      { char: "🦊", name: "Cara de zorro" },
      { char: "🐻", name: "Cara de oso" },
      { char: "🐼", name: "Cara de panda" },
      { char: "🐨", name: "Cara de koala" },
      { char: "🐯", name: "Cara de tigre" },
      { char: "🐸", name: "Cara de rana" },
      { char: "🐵", name: "Cara de mono" },
      { char: "🌸", name: "Flor de cerezo" },
      { char: "🌻", name: "Girasol" },
      { char: "🌈", name: "Arcoíris" },
      { char: "🌙", name: "Luna creciente" },
      { char: "☀️", name: "Sol" },
      { char: "🌿", name: "Rama verde" },
      { char: "🍀", name: "Trébol de cuatro hojas" },
    ],
  },
  {
    title: "Comida",
    emojis: [
      { char: "🍕", name: "Porción de pizza" },
      { char: "🍔", name: "Hamburguesa" },
      { char: "🍟", name: "Papas fritas" },
      { char: "🌮", name: "Taco" },
      { char: "🍣", name: "Sushi" },
      { char: "🍜", name: "Tazón de fideos" },
      { char: "🍩", name: "Dona" },
      { char: "🍪", name: "Galleta" },
      { char: "🎂", name: "Pastel de cumpleaños" },
      { char: "🍎", name: "Manzana" },
      { char: "🍌", name: "Plátano" },
      { char: "🍓", name: "Fresa" },
      { char: "🍇", name: "Uvas" },
      { char: "🥑", name: "Aguacate" },
      { char: "☕", name: "Café" },
      { char: "🍺", name: "Cerveza" },
    ],
  },
  {
    title: "Objetos y actividad",
    emojis: [
      { char: "🎉", name: "Fiesta" },
      { char: "🎊", name: "Confeti" },
      { char: "🎁", name: "Regalo" },
      { char: "🎈", name: "Globo" },
      { char: "🎸", name: "Guitarra" },
      { char: "🎧", name: "Auriculares" },
      { char: "🎮", name: "Mando de videojuegos" },
      { char: "⚽", name: "Balón de fútbol" },
      { char: "🏀", name: "Balón de baloncesto" },
      { char: "🏆", name: "Trofeo" },
      { char: "🚀", name: "Cohete" },
      { char: "⏰", name: "Reloj despertador" },
      { char: "💡", name: "Bombilla encendida" },
      { char: "📚", name: "Libros" },
      { char: "💻", name: "Computadora portátil" },
      { char: "📱", name: "Teléfono móvil" },
      { char: "✏️", name: "Lápiz" },
      { char: "🎯", name: "Diana" },
    ],
  },
];

const ITEM_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default function EmojiPicker(props: EmojiPickerProps) {
  const { onSelect, label = "Insertar emoji", className } = props;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      const gap = 8;
      const width = Math.min(304, window.innerWidth - margin * 2);
      const maxHeight = Math.min(288, window.innerHeight - margin * 2);
      const spaceAbove = rect.top - gap - margin;
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const openUp =
        spaceAbove >= Math.min(maxHeight, 224) || spaceAbove >= spaceBelow;
      const height = Math.round(
        Math.max(160, Math.min(maxHeight, openUp ? spaceAbove : spaceBelow)),
      );
      const left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - width - margin),
      );
      const top = openUp
        ? Math.max(margin, rect.top - gap - height)
        : rect.bottom + gap;
      setPosition({ top, left, width, maxHeight: height });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function chooseEmoji(emoji: string) {
    onSelect(emoji);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-flex${className ? ` ${className}` : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-9 items-center justify-center rounded-pill border-[1.5px] border-ink bg-surface text-ink shadow-[2px_2px_0_var(--color-ink)] transition-colors hover:bg-paper ${ITEM_FOCUS}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8.3 14.4c.9 1.3 2.2 2 3.7 2s2.8-.7 3.7-2" strokeLinecap="round" />
          <circle cx="9.2" cy="9.8" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy="9.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Selector de emojis"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              className="z-[120] overflow-y-auto overscroll-contain rounded-card border-[1.5px] border-ink bg-surface p-3 shadow-[4px_4px_0_var(--color-ink)]"
            >
              {EMOJI_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="px-1 pb-1 pt-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted first:pt-0">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-6 gap-0.5">
                    {group.emojis.map((emoji) => (
                      <button
                        key={emoji.name}
                        type="button"
                        title={emoji.name}
                        aria-label={emoji.name}
                        onClick={() => chooseEmoji(emoji.char)}
                        className="flex h-8 w-full items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                      >
                        <span aria-hidden="true">{emoji.char}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
