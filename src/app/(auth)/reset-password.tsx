import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useLocalSearchParams } from "expo-router"
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
  const { errorMessage, isSubmitting, resetPassword, successMessage } = useAuth()
  const passwordRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: params.token ?? "",
      password: "",
      passwordConfirmation: "",
    },
  })

  return (
    <FormScroll contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nova senha</Text>
        <Text style={styles.subtitle}>Informe o token recebido e escolha uma nova senha.</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="token"
          render={({ field: { onChange, value } }) => (
            <Input
              autoCapitalize="none"
              error={errors.token?.message}
              label="Token"
              onChangeText={onChange}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="Token de redefinição"
              returnKeyType="next"
              submitBehavior="submit"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              autoComplete="new-password"
              error={errors.password?.message}
              label="Nova senha"
              onChangeText={onChange}
              onSubmitEditing={() => confirmRef.current?.focus()}
              ref={passwordRef}
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
              onChangeText={onChange}
              onSubmitEditing={handleSubmit(resetPassword)}
              ref={confirmRef}
              returnKeyType="done"
              secureTextEntry
              value={value}
            />
          )}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <Button
          label="Redefinir senha"
          loading={isSubmitting}
          onPress={handleSubmit(resetPassword)}
        />
      </View>

      <Link href={routes.login} style={styles.linkCentered}>
        Voltar para login
      </Link>
    </FormScroll>
  )
}
