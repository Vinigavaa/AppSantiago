import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useLocalSearchParams } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                placeholder="Token de redefinição"
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
                secureTextEntry
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
