import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { signInSchema, type SignInInput } from "@/features/auth/schemas/auth-schemas"

export default function Login() {
  const { errorMessage, isSubmitting, signIn } = useAuth()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  })

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="username"
                error={errors.username?.message}
                label="Username"
                onChangeText={onChange}
                placeholder="seu.username"
                value={value}
              />
            )}
          />

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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="password"
                error={errors.password?.message}
                label="Senha"
                onChangeText={onChange}
                placeholder="Sua senha"
                secureTextEntry
                value={value}
              />
            )}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Button disabled={isSubmitting} label={isSubmitting ? "Entrando..." : "Entrar"} onPress={handleSubmit(signIn)} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ainda não tem conta?</Text>
          <Link href={routes.register} style={styles.link}>
            Criar conta
          </Link>
        </View>
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
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#475569",
  },
  form: {
    gap: 14,
  },
  header: {
    gap: 8,
    marginBottom: 28,
  },
  link: {
    color: "#0F766E",
    fontWeight: "700",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "800",
  },
})
