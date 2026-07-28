// Máscaras de digitação dos campos com formato conhecido. Cada função recebe o
// texto cru do onChangeText e devolve o valor já formatado e truncado no limite.
// Como todas começam extraindo dígitos e cortando com slice, o mesmo mecanismo
// resolve digitar além do limite, colar texto longo e caractere inválido: o
// excedente simplesmente não sobrevive à extração.

// CEP no formato 00000-000. Limite: 8 dígitos. O hífen só aparece a partir do
// sexto dígito, então apagar caracteres não deixa hífen residual.
export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)

  if (digits.length <= 5) return digits

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

// Telefone brasileiro. Limite: 11 dígitos. O formato é escolhido pela quantidade
// de dígitos, não pelo tipo da linha: até 10 usa fixo (00) 0000-0000, com 11 usa
// celular (00) 00000-0000. A transição acontece sozinha durante a digitação.
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`

  const isMobile = digits.length > 10
  const split = isMobile ? 7 : 6

  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`
}

// Valor monetário. Limite: 7 dígitos inteiros e 2 casas decimais, com no máximo
// um separador. Vírgula e ponto são aceitos na entrada e normalizados para
// vírgula, que é o separador esperado no teclado brasileiro.
export function maskCurrency(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(/\./g, ",")
  const [integerPart = "", ...rest] = cleaned.split(",")
  const integer = integerPart.slice(0, 7)

  if (rest.length === 0) return integer

  const decimals = rest.join("").slice(0, 2)

  return `${integer},${decimals}`
}
