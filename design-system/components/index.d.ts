import type { ReactNode, MouseEventHandler, ChangeEventHandler, FormEventHandler, InputHTMLAttributes } from 'react';

export type IconName = 'arrow-right' | 'arrow-left' | 'chevron-left' | 'chevron-right' | 'search' | 'menu' | 'cart' | 'book' | 'clock' | 'video' | 'play' | 'chip' | 'calc' | 'megaphone' | 'shield' | 'code' | 'pen' | 'user' | 'star';

/** Generic stroke icon (stand-in set). Inherits currentColor; sized by font-size. */
export function Icon(props: { name: IconName; label?: string; className?: string }): JSX.Element;

/** Button. primary = conversion (JobReady Blue); secondary = Klein Blue register/newsletter; outline = on white; promo = cyan top-bar; enroll = pale-blue course action. */
export function Button(props: { variant?: 'primary' | 'secondary' | 'outline' | 'promo' | 'enroll'; size?: 'md' | 'sm'; icon?: IconName; iconEnd?: IconName; href?: string; disabled?: boolean; type?: 'button' | 'submit'; onClick?: MouseEventHandler; className?: string; children: ReactNode }): JSX.Element;

/** Pill badge, 22px tall. sale = course discount; eyebrow = hero label. */
export function Badge(props: { tone?: 'brand' | 'sale' | 'info' | 'success' | 'eyebrow'; className?: string; children: ReactNode }): JSX.Element;

/** Icon-first professional-skill category card; fills blue on hover/active. */
export function CategoryCard(props: { title: string; icon?: IconName; count?: string; active?: boolean; href?: string; onClick?: MouseEventHandler; className?: string }): JSX.Element;

/** Commerce course card: image, sale badge, metadata, price hierarchy, enrolment action. */
export function CourseCard(props: { title: string; image?: string; imageAlt?: string; discount?: string; meta?: { icon: IconName; label: string }[]; price: string; oldPrice?: string; actionLabel?: string; href?: string; onEnroll?: MouseEventHandler; className?: string }): JSX.Element;

/** Narrow blue promotional strip with a compact cyan action. */
export function PromoBar(props: { message: ReactNode; actionLabel?: string; href?: string; onAction?: MouseEventHandler; label?: string; className?: string }): JSX.Element;

/** Two-tier site header: optional PromoBar, then logo, nav, search, cart and auth actions. */
export function SiteHeader(props: { promo?: { message: ReactNode; actionLabel?: string; href?: string }; logo?: ReactNode; links?: { label: string; href?: string; current?: boolean }[]; searchPlaceholder?: string; cartCount?: number; loginLabel?: string; registerLabel?: string; scrolled?: boolean; onMenu?: MouseEventHandler; className?: string }): JSX.Element;

/** Pill search field with a blue search icon. */
export function SearchField(props: { placeholder?: string; label?: string; value?: string; defaultValue?: string; onChange?: ChangeEventHandler<HTMLInputElement>; className?: string }): JSX.Element;

/** Labelled text input with help or error text. Extra props go to the <input>. */
export function TextField(props: { label: string; help?: string; error?: string; id?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>): JSX.Element;

/** Email field (6px radius) plus Klein Blue submit button, with a visible label. */
export function NewsletterForm(props: { label?: string; placeholder?: string; actionLabel?: string; onSubmit?: FormEventHandler; className?: string }): JSX.Element;

/** Large blue figure over a short label. */
export function Stat(props: { value: string; label: string; className?: string }): JSX.Element;

/** Blue progress bar with a label and percentage. value: 0–100. */
export function ProgressBar(props: { value: number; label: string; valueLabel?: string; className?: string }): JSX.Element;

/** Grayscale learner photo, outcome sentence, name, role and story link. */
export function SuccessStoryCard(props: { outcome: string; name: string; role: string; image?: string; video?: boolean; href?: string; linkLabel?: string; className?: string }): JSX.Element;

/** Spacious learner quote with optional orange star rating. */
export function Testimonial(props: { quote: string; name: string; role: string; rating?: number; className?: string }): JSX.Element;

/** Previous/next arrows and pagination dots for a carousel. Controlled: pass index and onChange. */
export function CarouselControls(props: { count: number; index: number; onChange?: (index: number) => void; className?: string }): JSX.Element;

/** Quiet credibility strip of partner names or logos. */
export function PartnerStrip(props: { title?: string; items: (string | { src: string; alt: string })[]; className?: string }): JSX.Element;

/** Split hero on the radial sky gradient: eyebrow, headline, lead, CTA, stats, portrait. */
export function Hero(props: { eyebrow?: string; title: ReactNode; lead?: string; actionLabel: string; href?: string; onAction?: MouseEventHandler; stats?: { value: string; label: string }[]; image?: string; imageAlt?: string; className?: string }): JSX.Element;
