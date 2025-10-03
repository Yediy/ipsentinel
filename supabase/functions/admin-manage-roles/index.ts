import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createSecureResponse } from '../_shared/security-headers.ts';
import { handleError, createAuthError, createValidationError } from '../_shared/error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleRequest {
  action: 'add' | 'remove';
  userId: string;
  role: 'admin' | 'moderator' | 'user';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw createAuthError('Missing authorization header');
    }

    // Get the requesting user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw createAuthError('Invalid authentication');
    }

    // Verify the requesting user is an admin
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminCheck) {
      throw createAuthError('Admin access required');
    }

    // Parse request body
    const body: RoleRequest = await req.json();

    // Validate request
    if (!body.action || !body.userId || !body.role) {
      throw createValidationError('Missing required fields: action, userId, role');
    }

    if (!['add', 'remove'].includes(body.action)) {
      throw createValidationError('Action must be "add" or "remove"');
    }

    if (!['admin', 'moderator', 'user'].includes(body.role)) {
      throw createValidationError('Role must be "admin", "moderator", or "user"');
    }

    // Prevent removing the last admin
    if (body.action === 'remove' && body.role === 'admin') {
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (count && count <= 1) {
        throw createValidationError('Cannot remove the last admin');
      }
    }

    // Perform the action
    let result;
    if (body.action === 'add') {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: body.userId,
          role: body.role,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw createValidationError('User already has this role');
        }
        throw error;
      }
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', body.userId)
        .eq('role', body.role)
        .select()
        .single();

      if (error) {
        throw error;
      }
      result = data;
    }

    // Log the action in audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: `role_${body.action}`,
      subject_type: 'user_roles',
      subject_id: body.userId,
      metadata: {
        role: body.role,
        target_user_id: body.userId,
      },
    });

    return createSecureResponse({
      success: true,
      action: body.action,
      role: body.role,
      userId: body.userId,
      result,
    });
  } catch (error) {
    console.error('Role management error:', error);
    return handleError(error);
  }
});
