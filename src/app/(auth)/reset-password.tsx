import { zodResolver } from "@hookform/resolvers/zod"
import { Link, Redirect, useLocalSearchParams } from "expo-router"
import { useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { Text, type TextInput, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { FormScroll } from "@/components/ui/FormScroll"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
import { authStyles as styles } from "@/features/auth/authStyles"
import { useAuth } from "@/features/auth/hooks/useAuth"
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas/auth-schemas"

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>()
  const token = typeof params.token === "string" && params.token ? params.token : null

  // O token chega da consulta de status, nunca digitado. Sem ele não há nada a
  // redefinir: o usuário precisa recomeçar pelo "Esqueci minha senha".
  if (!token) {
    return <Redirect href={routes.forgotPassword} />
  }

  return <ResetPasswordForm token={token} />
}

function ResetPasswordForm({ token }: { token: string }) {
  const { errorMessage, isSubmitting, resetPassword } = useAuth()
  const confirmRef = useRef<TextInput>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirmation: "",
    },
  })

  const submit = handleSubmit((input) => resetPassword(token, input))

  return (
    <FormScroll contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nova senha</Text>
        <Text style={styles.subtitle}>Escolha a nova senha da sua conta.</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              autoComplete="new-password"
              error={errors.password?.message}
              label="Nova senha"
              maxLength={128}
              onChangeText={onChange}
              onSubmitEditing={() => confirmRef.current?.focus()}
              returnKeyType="next"
              secureTextEntry
              submitBehavior="submit"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="passwordConfirmation"
          render={({ field: { onChange, value } }) => (
            <Input
              autoComplete="new-password"
              error={errors.passwordConfirmation?.message}
              label="Confirmar senha"
              maxLength={128}
              onChangeText={onChange}
              onSubmitEditing={submit}
              ref={confirmRef}
              returnKeyType="done"
              secureTextEntry
              value={value}
            />
          )}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button label="Redefinir senha" loading={isSubmitting} onPress={submit} />
      </View>

      <Link href={routes.login} style={styles.linkCentered}>
        Voltar para login
      </Link>
    </FormScroll>
  )
}
