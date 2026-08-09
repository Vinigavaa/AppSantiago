// Altura útil da barra de abas (ícone + rótulo), sem a área segura de baixo.
// A biblioteca reserva 49dp fixos, que não acomodam o rótulo quando o usuário
// aumenta a fonte do sistema — o texto era cortado ao meio.
//
// Fica aqui porque telas dentro das abas precisam do mesmo número para calcular
// o quanto o teclado realmente cobre a área delas.
export const TAB_BAR_CONTENT_HEIGHT = 58
