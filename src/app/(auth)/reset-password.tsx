import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useLocalSearchParams } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
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
            disabled={isSubmitting}
            label={isSubmitting ? "Redefinindo..." : "Redefinir senha"}
            onPress={handleSubmit(resetPassword)}
          />
        </View>

        <Link href={routes.login} style={styles.link}>
          Voltar para login
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  error: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    padding: 12,
  },
  form: {
    gap: 14,
  },
  header: {
    gap: 8,
    marginBottom: 28,
  },
  link: {
    alignSelf: "center",
    color: "#0F766E",
    fontWeight: "700",
    marginTop: 24,
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
  },
  success: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    color: "#166534",
    padding: 12,
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "800",
  },
})
