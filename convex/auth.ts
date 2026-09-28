import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    // YANA is a personal notebook: the first account created owns the
    // deployment and sign-ups are closed afterwards.
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;
      const someone = await ctx.db.query("users").first();
      if (someone) throw new Error("Sign-ups are closed on this YANA.");
      return await ctx.db.insert("users", { email: args.profile.email });
    },
  },
});
