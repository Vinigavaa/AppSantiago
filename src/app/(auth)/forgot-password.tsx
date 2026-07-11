import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
import { authStyles as styles } from "@/features/auth/authStyles"
import { useAuth } from "@/features/auth/hooks/useAuth"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas/auth-schemas"

export default function ForgotPassword() {
  const { errorMessage, isSubmitting, requestPasswordReset, successMessage } = useAuth()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>Informe seu email para receber o link de redefinição.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="email"
                error={errors.email?.message}
                inputMode="email"
                label="Email"
                onChangeText={onChange}
                placeholder="voce@email.com"
                value={value}
              />
            )}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Button
            label="Enviar link"
            loading={isSubmitting}
            onPress={handleSubmit(requestPasswordReset)}
          />
        </View>

        <Link href={routes.login} style={styles.linkCentered}>
          Voltar para login
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
