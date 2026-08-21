/** Ghép class name, bỏ qua giá trị rỗng/false/null. */
export default function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}
