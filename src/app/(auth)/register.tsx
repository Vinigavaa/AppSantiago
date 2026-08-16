import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Text, type TextInput, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { FormScroll } from "@/components/ui/FormScroll"
import { Input } from "@/components/ui/Input"
import { ProfileTypeSelector } from "@/components/ui/ProfileTypeSelector"
import { routes } from "@/constants/routes"
import { authStyles as styles } from "@/features/auth/authStyles"
import { TermsAcceptance } from "@/features/auth/components/TermsAcceptance"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas/auth-schemas"

export default function Register() {
  const { errorMessage, isSubmitting, signUp } = useAuth()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  // Sem isso, um formulário inválido não dá retorno algum junto ao botão: o
  // handleSubmit apenas não chama o signUp. O erro de cada campo fica acima e
  // pode estar fora da área visível — para quem toca, o botão parece morto.
  const [validationError, setValidationError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "CLIENT",
      acceptedTerms: false,
    },
  })

  return (
    <FormScroll contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Escolha como você vai usar o app.</Text>
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
              maxLength={30}
              onChangeText={onChange}
              onSubmitEditing={() => emailRef.current?.focus()}
              placeholder="seu.username"
              returnKeyType="next"
              submitBehavior="submit"
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
              keyboardType="email-address"
              label="Email"
              maxLength={254}
              onChangeText={onChange}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="voce@email.com"
              ref={emailRef}
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
              label="Senha"
              maxLength={128}
              onChangeText={onChange}
              placeholder="Mínimo de 8 caracteres"
              ref={passwordRef}
              returnKeyType="done"
              secureTextEntry
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="role"
          render={({ field: { onChange, value } }) => (
            <ProfileTypeSelector error={errors.role?.message} onChange={onChange} value={value} />
          )}
        />

        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { onChange, value } }) => (
            <TermsAcceptance
              error={errors.acceptedTerms?.message}
              onChange={onChange}
              value={value}
            />
          )}
        />

        {validationError ?? errorMessage ? (
          <Text style={styles.error}>{validationError ?? errorMessage}</Text>
        ) : null}

        <Button
          label="Criar conta"
          loading={isSubmitting}
          onPress={handleSubmit(
            (values) => {
              setValidationError(null)
              return signUp(values)
            },
            (fieldErrors) => {
              setValidationError(
                fieldErrors.acceptedTerms
                  ? "É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta."
                  : "Revise os campos destacados acima para continuar.",
              )
            },
          )}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já tem conta?</Text>
        <Link href={routes.login} style={styles.link}>
          Entrar
        </Link>
      </View>
    </FormScroll>
  )
}
